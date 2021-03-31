
//°

define(['esper', 'skulpt'], function(esper, skulpt){
    //window.JSCPP = JSCPP;
    
    // fale infinite string for cpp input
    class FakeString {
        constructor(gen){
            if (typeof(gen) === 'function'){
                this.gen = gen();
                this.buffer = '';
            }
            else {
                this.setLoop(gen);
            }
        }
        
        setLoop(content){
            this.buffer = '';
            this[0] = undefined;
            this.gen = (function* (){
                while (true) {
                    yield content;
                }
            })();
        }
        
        requireMore(){
            var next = this.gen.next();
            if (!next.done) {
                this.buffer = this.buffer + next.value;
            }
            this[0] = this.buffer[0];
        }
        
        checkLen() {
            if (this.buffer.trim().length == 0){
                this.requireMore();
            }
        }
        
        get length() {
            this.checkLen();
            return this.buffer.length;
        }
        
        indexOf(s){
            this.checkLen();
            return this.buffer.indexOf(s);
        }
        
        substr(s, e){
            this.checkLen();
            if (e === undefined){
                this.buffer = this.buffer.substr(s);
                //this.checkLen();
                this[0] = this.buffer[0];
                return this;
            }
            else{
                return this.buffer.substr(s, e);
            }
        }
        
        replace(src, target){
            this.checkLen();
            this.buffer = this.buffer.replace(src, target);
            //this.checkLen();
            this[0] = this.buffer[0];
            return this;
        }
        
        match(s){
            this.checkLen();
            return this.buffer.match(s);
        }
        
    }
    
    // # standard interface:
    // defGlobal(key, tamplate)
    // setGlobal(key, obj)
    // defHook(name, params) // params is a template, [xxx, xxx]
    // defFunc(name, params, callback)
    // init(code)
    // callHook(name, params)
    
    return {
        createJs : function(){
            var sandbox = esper({
            	strict : true,
            	executionLimit : 10000,
            });
            //window.sandbox = sandbox;
            return {
                internal : sandbox,
                hooks : [],
                defGlobal : function(key, template){
                    this.setGlobal(key, template); // same as set
                },
                setGlobal : function(key, obj){
                    if (typeof(obj) == 'function'){
                        //Sk.builtins[key] = wrapFunction(value);
                        throw "please use defFunc";
                    }
                    sandbox.addGlobal(key, obj);
                },
                defHook : function(name, params){
                    this.hooks.push({name, params});
                },
                defFunc : function(name, params, callback){
                    sandbox.addGlobal(name, callback);
                },
                init : function(code){
                    var that = this;
                    // override standard log func
                    var log = function(m){
                        if (that.onStdout != null){
                            that.onStdout(m);
                        }
                    }
                    this.defFunc('log', [null], log);
                    this.setGlobal('console', {log});
                    sandbox.load(code);
                    sandbox.runSync();
                    //console.log(this.hooks);
                    for (var i = 0; i < this.hooks.length; i++){
                        var hook = this.hooks[i];
                        var hookFunc = sandbox.evalSync(hook.name).toNative();
                        if (typeof(hookFunc) != 'function'){
                            throw `"${hook.name}" is not a function`;
                        }
                    }
                },
                callHook : function(name, params){
                    sandbox.evalSync(name + '()');
                },
            };
        },
        
        createPy : function() {
            var Sk = skulpt();
            //window.Skinst = Sk;
            // python engine init
            Sk.configure({ 
                output: function(str) {
                    console.log(str);
                },
                read: function (x) {
                    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
                        throw "File not found: '" + x + "'";
        			}
                    return Sk.builtinFiles["files"][x];
                },
        		retainglobals: true
            }); 
            
            function wrapFunction(func){
                return function(){
                    //console.log(arguments);
                    var args = new Array(arguments.length);
                    for (var i = 0; i < arguments.length; i++){
                        try{
                            args[i] = Sk.ffi.remapToJs(arguments[i]);
                        }
                        catch(e){
                            console.log(e);
                            console.log('can not convert par' + i);
                            console.log(arguments[i]);
                        }
                    }
                    //console.log(args);
                    func(...args);
                };
            }
            
            function wrapFunctionObj(obj){
                for (var k in obj){
                    if (typeof(obj[k]) == 'function'){
                        obj[k] = wrapFunction(obj[k]).bind(obj);
                    }
                    else if (typeof(obj[k]) == 'object'){
                        wrapFunctionObj(obj[k]);
                    }
                }
            }
            
            function evalSync(code){
                window.Sk = Sk;
                Sk.importMainWithBody("<stdin>", false, code, false)
                window.Sk = undefined;
            }
            
            return {
                internal : Sk,
                hooks : [],
                defGlobal : function(key, template){
                    this.setGlobal(key, template); // same as set
                },
                setGlobal : function(key, obj){
                    if (typeof(obj) == 'function'){
                        //Sk.builtins[key] = wrapFunction(value);
                        throw "please use defFunc";
                    }
                    else if (typeof(obj) == 'object') {
                        wrapFunctionObj(obj);
                        Sk.builtins[key] = Sk.ffi.remapToPy(obj);
                    }
                    else{
                        Sk.builtins[key] = Sk.ffi.remapToPy(obj);
                    }
                },
                defHook : function(name, params){
                    this.hooks.push({name, params});
                },
                defFunc : function(name, params, callback){
                    if (typeof(callback) == 'function'){
                        Sk.builtins[name] = wrapFunction(callback);
                    }
                    else {
                        throw "not a func";
                    }
                },
                init : function(code){
                    var that = this;
                    // override standard log func
                    var log = function(m){
                        if (that.onStdout != null){
                            that.onStdout(m);
                        }
                    }
                    this.defFunc('print', [null], log);
                    evalSync(code);
                },
                callHook : function(name, params){
                    evalSync(name + '()');
                },
            };
        },
        // 注意统一exception格式
        // 处理js-python类型转换问题
        
        // must add all globals before init
        createCpp : function(){
            
            function codeWrap(code, funcs, hooks) {
                
                // js call c
                var hookSwitch = '';
                for (var k in hooks){
                    var hook = hooks[k];
                    //console.log(hook);
                    var paramsInC = [];
                    hookSwitch += '\n';
                    hookSwitch += `case ${hook.id}:`;
                    hookSwitch += '\n';
                    for (var i = 0; i < hook.params.length; i++){
                        var paramTemplate = hook.params[i];
                        if (Math.floor(paramTemplate) == paramTemplate){
                            //int
                            paramsInC.push('int' + i);
                            hookSwitch += `scanf("%d", &int${i});`
                        }
                        else{
                            //float
                            paramsInC.push('float' + i);
                            hookSwitch += `scanf("%f", &float${i});`
                        }
                        hookSwitch += '\n';
                    }
                    hookSwitch += `${hook.name}(${paramsInC.join(', ')});`;
                    hookSwitch += '\n';
                    hookSwitch += 'break;';
                    
                }
                //console.log(hookSwitch);
                
                // c call js
                var funcsDef = '';
                for (var k in funcs){
                    var func = funcs[k];
                    var paramsInC = [];
                    var paramsInFunc = [];
                    var paramsInPrintf = [];
                    for (var i = 0; i < func.params.length; i++){
                        var paramTemplate = func.params[i];
                        if (Math.floor(paramTemplate) == paramTemplate){
                            //int
                            paramsInC.push('p' + i);
                            paramsInFunc.push('int p' + i);
                            paramsInPrintf.push('%d');
                        }
                        else{
                            //float
                            paramsInC.push('p' + i);
                            paramsInFunc.push('float p' + i);
                            paramsInPrintf.push('%f');
                        }
                    }
                    funcsDef += '\n';
                    funcsDef += `void ${func.name}(${paramsInFunc.join(', ')})`;
                    funcsDef += '\n';
                    funcsDef += '{';
                    funcsDef += '\n';
                    funcsDef += `printf("$call:${func.name}|${paramsInPrintf.join('|')}", ${paramsInC.join(', ')});`;
                    funcsDef += '\n';
                    funcsDef += '}';
                    funcsDef += '\n';
                }
                
                return `
#include <stdio.h>
#include <stdlib.h>
using namespace std;

float getFloat(char* query){
    float res;
    printf("$gf:%s", query);
    scanf("%f", &res);
    return res;
}

${funcsDef}

${code}

void loop() {
    int cmd;
    int ${[1,2,3,4,5,6,7,8,9].map(i=>'int'+i).join(', ')};
    float ${[1,2,3,4,5,6,7,8,9].map(i=>'float'+i).join(', ')};
    scanf("%d", &cmd);
    switch(cmd){
${hookSwitch}
        default:
            break;
    }
}

void main(){
    while (true) {
        loop();
    }
}
                `;
            }
            
            var hookId = 0;
            return {
                internal : undefined,
                hooks : {},
                funcs : {},
                globals : {},
                defGlobal : function(key, template){
                    if (typeof(template) == 'object'){
                        for (var k in template) {
                            this.defGlobal(key + '.' + k, template[k]);
                        }
                    }
                    else if (typeof(template) == 'number'){ //currently only numbers are allowed
                        this.globals[key] = template;
                    }
                },
                setGlobal : function(key, obj){
                    this.defGlobal(key, obj);
                },
                defHook : function(name, params){
                    this.hooks[name] = {
                        name, 
                        params, 
                        id : hookId++,
                    };
                },
                defFunc : function(name, params, callback){
                    this.funcs[name] = {
                        name : name,
                        params : params,
                        callback : callback,
                    };
                },
                init : function(code){
                    var that = this;
                    // override standard log func
                    var log = function(m){
                        if (that.onStdout != null){
                            that.onStdout(m);
                        }
                    }
                    var fstr = new FakeString('1 1 4 5 1 4 ');
                    this.fstr = fstr;
                    var wrapped = codeWrap(code, this.funcs, this.hooks);
                    //console.log(wrapped);
                    var mydebugger = JSCPP.run(wrapped, '', { 
                        debug : true, 
                        stdio : { 
                            drain: function () {
                                return fstr;
                            },
                            write: function(s) {
                                //console.log('cppoutput: ' + s)
                                if (s.startsWith('$gf:')){
                                    var id = s.replace('$gf:', '');
                                    //console.log('c requiring global : ' + id);
                                    if (that.globals.hasOwnProperty(id)) {
                                        fstr.setLoop(that.globals[id] + '\n');
                                    }
                                    else{
                                        throw "no such variable : " + id;
                                    }
                                }
                                else if (s.startsWith('$call:')){
                                    var params = s.replace('$call:', '').split('|');
                                    var funcName = params.shift();
                                    if (that.funcs.hasOwnProperty(funcName)){
                                        var func = that.funcs[funcName];
                                        for (var i = 0; i < func.params.length; i++){
                                            if (typeof(func.params[i]) == 'number'){
                                                params[i] = Number(params[i]);
                                            }
                                        }
                                        func.callback(...params);
                                    }
                                    else{
                                        throw "no such function : " + funcName;
                                    }
                                }
                                else{
                                    // normal log
                                    log(s);
                                }
                            },
                        },
                    });
                    
                    // stop conditions
                    mydebugger.stopConditions.isStatement = false;
                    mydebugger.stopConditions.positionChanged = false;
                    mydebugger.stopConditions.lineChanged = false;
                    mydebugger.stopConditions.loopCond = true;
                    mydebugger.conditions.loopCond = function (prevNode, nextNode) {
                    	if (nextNode.type == 'IdentifierExpression' && nextNode.Identifier == 'loop') {
                    	    //console.log(nextNode);
                    		return true;
                    	} else {
                    		return false;
                    	}
                    };
                    // run to the first loop
                    mydebugger.continue();
                    
                    this.internal = mydebugger;
                },
                callHook : function(name, params){
                    if (this.hooks.hasOwnProperty(name)){
                        var hook = this.hooks[name];
                        this.fstr.setLoop(hook.id + '\n' + params.join(' ') + '\n');
                        this.internal.continue();
                    }
                    else{
                        throw "no such hook : " + name;
                    }
                },
            };
        },
    };
});


