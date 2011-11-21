var jscsv = {};

/*
   file = record *(CRLF record) [CRLF]
   record = field *(COMMA field)
   field = (escaped / non-escaped)
   escaped = DQUOTE *(TEXTDATA / COMMA / CR / LF / 2DQUOTE) DQUOTE
   non-escaped = *TEXTDATA
   COMMA = %x2C
   CR = %x0D ;as per section 6.1 of RFC 2234 [2]
   DQUOTE =  %x22 ;as per section 6.1 of RFC 2234 [2]
   LF = %x0A ;as per section 6.1 of RFC 2234 [2]
   CRLF = CR LF ;as per section 6.1 of RFC 2234 [2]
   TEXTDATA =  %x20-21 / %x23-2B / %x2D-7E
*/

jscsv.Csv = function(config) {
	var me = this;
	
	me.config = config || {
		forceWinLinebreaks : false
	};
	me.state = {
		currentSymbol : 'record',
		lastChar : null
	};
	me.endRecord();
};

jscsv.Csv.prototype = {

	parse : function(string) {
		var me = this;
	
		for (var i=0, len = string.length; i < len; i++) {
			me.parseNext(string.charCodeAt(i));
		}
		
		me.endRecord();
	},
	
	endRecord : function() {
		var me = this;
		
		if (me.record && me.record.started) {
			me.endField();
			
			if (me.config.onRecord) {
				me.config.onRecord(me.record.fields);
			}
		}
		
		me.record = {
			started : false,
			field : '',
			fields : []
		};
		
		me.state.currentSymbol = 'record';
	},

	parseNext : function(char) {
		var me = this;
		//console.log(me.state.currentSymbol, char, String.fromCharCode(char));
		
		switch (me.state.currentSymbol) {
			case 'record':
				me.fromRecord(char); break;
			case 'escaped':
				me.fromEscaped(char); break;
			case 'dquoteInEscaped':
				me.fromDquoteInEscaped(char); break;
			case 'nonEscaped':
				me.fromNonEscaped(char); break;
		}
		
		me.state.lastChar = char;
	},
	
	fromRecord : function(char) {
		var me = this;
		
		switch (char) {
			case 0x0D: // CR
				break;
			case 10: // LF
				if (!me.forceWinLinebreaks ||
					 (me.forceWinLinebreaks && me.state.lastChar == 0x0D)
				   ) {
					me.endRecord();
					break;
				} 
			case 0x22: // "
				me.transitionTo('escaped');
				break;
			case 0x2C: // ,
				this.endField();
				break;
			default:
				me.transitionTo('nonEscaped');
				me.addChar(char);
		}
	},
	
	endField : function() {
		var me = this;
	
		me.record.fields.push(me.record.field);
		me.record.field = '';
		me.state.currentSymbol = 'record';
	},
	
	fromEscaped : function(char) {
		var me = this;
	
		switch (char) {
			case 0x22:
				me.transitionTo('dquoteInEscaped');
				return;
			default:
				me.addChar(char);
		}
	},
	
	transitionTo : function(symbol) {
		//console.log('transitionTo', symbol);
		this.state.currentSymbol = symbol;
	},
	
	addChar : function(char) {
		var me = this;
		
		me.record.started = true;
		me.record.field += String.fromCharCode(char);
	},
	
	fromNonEscaped : function(char) {
		var me = this;
		
		switch (char) {
			case 0x0D: // CR
				break;
			case 10: // LF
				if (!me.forceWinLinebreaks ||
					 (me.forceWinLinebreaks && me.state.lastChar == 0x0D)
				   ) {
					me.endRecord();
					break;
				} 
			case 0x22: // "
				throw new Error("Unexpected symbol: \" in unescaped record");
			case 0x2C: // ,
				this.endField();
				break;
			default:
				me.addChar(char);
		}
	},
	
	fromDquoteInEscaped : function(char) {
		var me = this;
	
		switch (char) {
			case 0x22: // "
				me.transitionTo('escaped');
				me.addChar(char);
				return;
			default:
				return me.fromNonEscaped(char);
		}
	},
	
	clearState : function() {
		this.state = {};
	}

};
