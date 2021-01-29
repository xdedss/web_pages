


//append to logic-parser.js

(function(){
    //var process = new RegExp("(?<=[A-Z|a-z|0-9|\'|\\)])([A-Z|\\(])", 'g');
    function inputPreprocess(str){
        //return str.replace(' ', '').replace(process,"*$1");
        str = str.replace(' ', '');
        var endChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\')';
        var startChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ('
        var res = '';
        var i = 0
        for (; i < str.length - 1; i++){
            res += str[i];
            if (endChar.indexOf(str[i]) >= 0){
                if (startChar.indexOf(str[i+1]) >= 0){
                    res += '*';
                }
            }
        }
        res += str[i];
        return res;
    }
    
    function parseLogic(str){
        return logicParser.parse(inputPreprocess(str))
    }
    
    var evalFunc = {
        'or' : args=>args[1] || args[2],
        'and' : args=>args[1] && args[2],
        'xor' : args=>args[1] != args[2],
        'not' : args=>!args[1],
    }
    function evaluate(logic, table, defaultValue){
        if (defaultValue === undefined) defaultValue = true;
        switch (typeof(logic)){
            case 'boolean':
                return logic;
            case 'string':
                if (logic in table){
                    return !!table[logic];
                }
                else{
                    return !!defaultValue;
                }
            default:
                var logic_ = [];
                for (var i = 1; i < logic.length; i++){
                    logic_[i] = evaluate(logic[i], table, defaultValue);
                }
                return evalFunc[logic[0]](logic_);
        }
    }
    
    function evaluateTable(logic, order, defaultValue){
        if (order.length > 6) {
            throw 'too many variables';
        }
        var res = [];
        var table = {};
        var len = 1 << order.length;
        for (var i = 0; i < len; i++){
            for (var j = 0; j < order.length; j++){
                table[order[j]] = ((i >> j) & 1) == 1;
            }
            res.push(evaluate(logic, table, defaultValue));
        }
        return res;
    }
    
    logicParser.parseLogic = parseLogic;
    logicParser.evaluate = evaluate;
    logicParser.evaluateTable = evaluateTable;
    
})();