var jscsv = {};

jscsv.Csv = function() {

    var
    STATE_RECORD = 0,
    STATE_ESCAPED = 1,
    STATE_NON_ESCAPED = 2,
    STATE_DQUOTE_IN_ESCAPED = 3,

    CHAR_CR = 0x0D,
    CHAR_LF = 10,
    CHAR_DQUOTE = 0x22,
    CHAR_COMMA = 0x2C,

    constructor = function(config) {
        var me = this;

        me.config = config || {
            forceWinLinebreaks : false
        };

        me.state = {
            currentSymbol : STATE_RECORD,
            lastChar : null
        };

        endRecord.call(me);
    },

    parseNext = function(character) {
        var me = this;

        switch (me.state.currentSymbol) {
            case STATE_RECORD:
                fromRecord.call(me, character); break;
            case STATE_ESCAPED:
                fromEscaped.call(me, character); break;
            case STATE_DQUOTE_IN_ESCAPED:
                fromDquoteInEscaped.call(me, character); break;
            case STATE_NON_ESCAPED:
                fromNonEscaped.call(me, character); break;
        }

        me.state.lastChar = character;
    },

    endRecord = function() {
        var me = this;

        if (me.record && me.record.started) {
            endField.call(me);

            if (me.config.onRecord) {
                me.config.onRecord(me.record.fields);
            }
        }

        me.record = {
            started : false,
            field : '',
            fields : []
        };

        me.state.currentSymbol = STATE_RECORD;
    },

    fromRecord = function(character) {
        var me = this;

        switch (character) {
            case CHAR_CR:
                break;
            case CHAR_LF:
                if (!me.forceWinLinebreaks ||
                        (me.forceWinLinebreaks && me.state.lastChar == CHAR_CR)
                        ) {
                    endRecord.call(me);
                    break;
                }
            case CHAR_DQUOTE:
                transitionTo.call(me, STATE_ESCAPED);
                break;
            case CHAR_COMMA:
                endField.call(me);
                break;
            default:
                transitionTo.call(me, STATE_NON_ESCAPED);
                addChar.call(me, character);
        }
    },

    fromEscaped = function(character) {
        var me = this;

        switch (character) {
            case CHAR_DQUOTE:
                transitionTo.call(me, STATE_DQUOTE_IN_ESCAPED);
                return;
            default:
                addChar.call(me, character);
        }
    },

    fromNonEscaped = function(character) {
        var me = this;

        switch (character) {
            case CHAR_CR:
                break;
            case CHAR_LF:
                if (!me.forceWinLinebreaks ||
                        (me.forceWinLinebreaks && me.state.lastChar == CHAR_CR)
                        ) {
                    endRecord.call(me);
                    break;
                }
            case CHAR_DQUOTE:
                throw new Error("Unexpected symbol: \" in unescaped record");
            case CHAR_COMMA:
                endField.call(me);
                break;
            default:
                addChar.call(me, character);
        }
    },

    fromDquoteInEscaped = function(character) {
        var me = this;

        switch (character) {
            case CHAR_DQUOTE:
                transitionTo.call(me, STATE_ESCAPED);
                addChar.call(me, character);
                return;
            default:
                return fromNonEscaped.call(me, character);
        }
    },

    transitionTo = function(symbol) {
        this.state.currentSymbol = symbol;
    },

    addChar = function(character) {
        var me = this;

        me.record.started = true;
        me.record.field += String.fromCharCode(character);
    },

    clearState = function() {
        this.state = {};
    },

    endField = function() {
        var me = this;

        me.record.fields.push(me.record.field);
        me.record.field = '';
        me.state.currentSymbol = STATE_RECORD;
    };

    constructor.prototype = {

        parse : function(string) {
            var me = this;

            for (var i = 0, len = string.length; i < len; i++) {
                parseNext.call(me, string.charCodeAt(i));
            }

            endRecord.call(me);
        }

    };

    return constructor;
}();
