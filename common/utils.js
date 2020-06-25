

var utils = {};

(function(){
    
    function getParams(url) {
        url = url == null ? window.location.href : url;
        var paramIndex = url.lastIndexOf("?");
        if (paramIndex == -1) return {};
        var paramStr = url.substring(paramIndex + 1).split('&');
        var res = {};
        for (var i = 0; i < paramStr.length; i++){
            var pair = paramStr[i].split('=');
            if (pair.length == 2){
                res[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
        }
        return res;
    }
    
    function clamp(num, min, max){
        if (min > max) return clamp(num, max, min);
        if (num > max) return max;
        if (num < min) return min;
        return num;
    }
    
    function padLeft(str, c, numChar){
        while (str.length < numChar){
            str = c + str;
        }
        return str;
    }
    function padRight(str, c, numChar){
        while (str.length < numChar){
            str = str + c;
        }
        return str;
    }
    
    function repeat(o, n){
        if (o instanceof Array){
            var res = [];
            for(var i = 0; i < n; i++){
                o.forEach(a=>res.push(a));
            }
            return res;
        }
        else if (typeof(o) == 'string'){
            var res = '';
            for(var i = 0; i < n; i++){
                res += o;
            }
            return res;
        }
        throw 'type not supported : ' + o;
    }
    
    function instantiate(o){
        if (typeof(o) == 'object'){
            var res = {};
            for (var k in o){
                res[k] = instantiate(o[k]);
            }
            return res;
        }
        return o;
    }
    
    
    utils.getParams = getParams;
    utils.clamp = clamp;
    utils.padLeft = padLeft;
    utils.padRight = padRight;
    utils.repeat = repeat;
    
})();