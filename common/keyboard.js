//全局键盘事件
// xdedss 2020
// MIT License

(function($, kb){
    
    var namemap = {
        "0":48,"1":49,"2":50,"3":51,"4":52,"5":53,"6":54,"7":55,"8":56,"9":57,
        "q":81,"Shift":16,"Q":81,"w":87,"e":69,"r":82,"t":84,"y":89,"u":85,"i":73,"o":79,"p":80,"[":219,"]":221,"\\":220,
        "a":65,"s":83,"d":68,"f":70,"g":71,"h":72,"j":74,"k":75,"l":76,";":186,"'":222,"Enter":13,
        "z":90,"x":88,"c":67,"v":86,"b":66,"n":78,"m":77,",":188,".":190,"/":191,
        "Tab":9,"CapsLock":20,"Unidentified":255,"Control":17,"Meta":91,"Alt":18,"PageUp":33,"PageDown":34,
        "ArrowUp":38,"ArrowDown":40,"ArrowRight":39,"ArrowLeft":37,"-":189,"=":187,"Backspace":8,
        "`":192,"~":192,"!":49,"@":50,"#":51,"$":52,"%":53,"^":54,"&":55,"*":56,"(":57,")":48,"_":189,"+":187,
        "W":87,"E":69,"R":82,"T":84,"Y":89,"U":85,"I":73,"O":79,"P":80,"{":219,"}":221,"|":220,
        "A":65,"S":83,"D":68,"F":70,"G":71,"H":72,"J":74,"K":75,"L":76,":":186,"\"":222,
        "Z":90,"X":88,"C":67,"V":86,"B":66,"N":78,"M":77,"<":188,">":190,"?":191, "Space":32,
        "F1":112,"F2":113,"F3":114,"F4":115,"F5":116,"F6":117,"F7":118,"F8":119,"F9":120,"F10":121,"F11":122,"F12":123
    };
    
    var keymap = {
        set : function(i, v){
            this[i] = v;
        }
    };
    var listeners = {};
    
    var onKeyDown = function(e){
        if (listeners[e.keyCode]){
            listeners[e.keyCode].down.forEach(l=>l.callback());
        }
    };
    
    var onKeyUp = function(e){
        if (listeners[e.keyCode]){
            listeners[e.keyCode].up.forEach(l=>l.callback());
        }
    };
    
    $(document).keydown(e=>{
        //var old = keymap.get(e.keyCode);
        if (!keymap[e.keyCode]){
            onKeyDown(e);
            keymap.set(e.keyCode, true);
        }
    }).keyup(e=>{
        //var old = keymap.get(e.keyCode);
        if (keymap[e.keyCode]){
            onKeyUp(e);
            keymap.set(e.keyCode, false);
        }
    });
    
    var registerKey = function(type, keycode, callback){
        if (typeof(keycode) == "string"){
            if (namemap[keycode] != null){
                keycode = namemap[keycode];
            }
            else{
                throw 'unknown key string: ' + keycode;
            }
        }
        if (listeners[keycode] == null){
            listeners[keycode] = {
                down : [], up : [],
            };
        }
        var listener = {
            keycode : keycode,
            type : 'down',
            callback : callback,
        }
        listeners[keycode][type].push(listener);
        return listener;
    }
    
    kb.onKeyDown = function(keycode, callback){
        if (keycode instanceof Array){
            var res = [];
            keycode.forEach(kc=>res.push(registerKey('down', kc, callback)));
            return res;
        }
        else{
            return registerKey('down', keycode, callback);
        }
    };
    
    kb.onKeyUp = function(keycode, callback){
        if (keycode instanceof Array){
            var res = [];
            keycode.forEach(kc=>res.push(registerKey('up', kc, callback)));
            return res;
        }
        else{
            return registerKey('up', keycode, callback);
        }
    };
    
    kb.getKey = function(keycode){
        if (typeof(keycode) == "string") {
            if (namemap[keycode] != null){
                return keymap.get(namemap[keycode]);
            }
            else{
                throw 'unknown key string: ' + keycode;
            }
        }
        return keymap.get(keycode);
    };
    
    kb.remove = function(listener){
        if (listeners[listener.keycode]){
            var index = listeners[listener.keycode][listener.type].indexOf(listener);
            if (index >= 0){
                listeners[listener.keycode][listener.type].splice(index, 1);
            }
        }
    }
    
})(jQuery, window.kb = {});