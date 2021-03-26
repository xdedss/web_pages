//requires jQuery

// listen to mouse events in a limited area
// xdedss 2020
// MIT License

var events = {};


(function($){
    
    function lerp(f1, f2, t){
        return f1 * (1-t) + f2 * t;
    }
    
    function revLerp(f, f1, f2){
        return (f - f1) / (f2 - f1);
    }
    
    function map(f, f1, f2, to1, to2){
        return to1 + (to2-to1) * (f-f1) / (f2-f1);
    }
    
    function cross(vl, vr){
        return vl[0] * vr[1] - vr[0] * vl[1];
    }
    
    function neg(v){
        return [-v[0], -v[1]];
    }
    
    function add(vl, vr){
        return [vl[0]+vr[0], vl[1]+vr[1]];
    }
    
    function sub(vl, vr){
        return add(vl, neg(vr));
    }
    
    function scanlineIntersect(ps, p1, p2){
        if (p1[1] == p2[1]) return false;
        if (p1[1] > p2[1]){
            var c = p2;
            p2 = p1;
            p1 = c;
        }
        if (p1[1] > ps[1] || p2[1] <= ps[1]) return false;
        var xc = map(ps[1], p1[1], p2[1], p1[0], p2[0]);
        return xc <= ps[0];
    }
    
    function insideShape(ps, vertices){
        if (vertices.length < 2) return false;
        if (vertices.length == 2){
            return insideRect(ps, vertices[0], vertices[1]);
        }
        var count = 0;
        var i = 0;
        for (; i < vertices.length - 1; i++){
            if (scanlineIntersect(ps, vertices[i], vertices[i + 1])){
                count++;
            }
        }
        if (scanlineIntersect(ps, vertices[i], vertices[0])){
            count++;
        }
        return count % 2 == 1;
    }
    
    function insideRect(ps, p1, p2){
        return ps[0] >= Math.min(p1[0],p2[0]) && ps[0] < Math.max(p1[0],p2[0])
           && ps[1] >= Math.min(p1[1],p2[1]) && ps[1] < Math.max(p1[1],p2[1]);
    }
    
    function getBoundRect(vertices){
        if (vertices.length == 0) return null;
        var p1 = [vertices[0][0], vertices[0][1]];
        var p2 = [vertices[0][0], vertices[0][1]];
        for (var i = 1; i < vertices.length; i++){
            if (vertices[i][0] < p1[0]) p1[0] = vertices[i][0];
            if (vertices[i][0] > p2[0]) p2[0] = vertices[i][0];
            if (vertices[i][1] < p1[1]) p1[1] = vertices[i][1];
            if (vertices[i][1] > p2[1]) p2[1] = vertices[i][1];
        }
        return [p1, p2];
    }
    
    var activeAreas = [];
    
    function createArea(){
        return {
            shapes : [],
            activeShape : null,
            active : false,
            downShape : null,
            // vertices could be an array of [relativeX, relativeY] 
            // or a function that returns such array dynaimcally
            registerListener : function(vertices, listeners, index){
                if (index === undefined) index = 0;
                
                var vertices_static = vertices;
                var index_static = index;
                var listeners_click = listeners;
                
                //vert/bound
                var bound;
                if (typeof(vertices) != 'function') {
                    var boundStatic = getBoundRect(vertices);
                    vertices = ()=>vertices_static;
                    bound = ()=>boundStatic;
                }
                else{
                    bound = function(){return getBoundRect(this.vertices())};
                }
                
                //listener
                if (typeof(listeners) == 'function'){
                    listeners = {
                        'click' : listeners_click
                    };
                }
                
                //index
                if (typeof(index) != 'function') {
                    index = ()=>index_static;
                }
                this.shapes.push({
                    vertices : vertices,
                    bound : bound,
                    listeners : listeners,
                    index : index,
                    tryCall : function(fname, e){
                        var func = this.listeners[fname];
                        if (func !== undefined){
                            e.innerType = fname;
                            func(e);
                        }
                    },
                });
            },
            raycast : function(ps){
                var res = [];
                for (var i = 0; i < this.shapes.length; i++){
                    var shape = this.shapes[i];
                    var bound = shape.bound();
                    if (insideRect(ps, bound[0], bound[1])){
                        var vertices = shape.vertices();
                        if (insideShape(ps, vertices)){
                            res.push(shape);
                        }
                    }
                }
                if (res.length == 0) return null;
                var resMax = res[0];
                var resMaxIndex = res[0].index();
                for (var i = 1; i < res.length; i++){
                    var resIndex = res[i].index();
                    if (resIndex >= resMaxIndex){
                        resMaxIndex = resIndex;
                        resMax = res[i];
                    }
                }
                return resMax;
            },
            updateMove : function(e){
                if (e.relativeX == -1){
                    if (this.activeShape != null) this.activeShape.tryCall('mouseleave', e);
                    this.activeShape = null;
                    this.downShape = null;
                    return null;
                }
                var ps = [e.relativeX, e.relativeY];
                var cast = this.raycast(ps);
                if (cast != this.activeShape){
                    if (this.activeShape != null) this.activeShape.tryCall('mouseleave', e);
                    if (cast != null) cast.tryCall('mouseenter', e);
                }
                if (cast != null) cast.tryCall('mousemove', e);
                if (cast != this.downShape){
                    this.downShape = null;
                }
                this.activeShape = cast;
            },
            updateUp : function(e){
                var ps = [e.relativeX, e.relativeY];
                var cast = this.raycast(ps);
                if (cast != null){
                    cast.tryCall('mouseup', e);
                    if (this.downShape == cast && e.which == 1){
                        cast.tryCall('click', e);
                    }
                }
                this.downShape = null;
            },
            updateDown : function(e){
                var ps = [e.relativeX, e.relativeY];
                var cast = this.raycast(ps);
                if (cast != null){
                    cast.tryCall('mousedown', e);
                    if (e.which == 1){
                        this.downShape = cast;
                    }
                }
            },
            updateMenu : function(e){
                var ps = [e.relativeX, e.relativeY];
                var cast = this.raycast(ps);
                if (cast != null){
                    cast.tryCall('contextmenu', e);
                }
            },
        }
    }
    
    function registerArea(rect){
        if (rect instanceof HTMLElement){
            var rect_ = rect;
            rect = function(){
                var jqrect = $(rect_);
                var pos = jqrect.position();
                var width = jqrect.outerWidth();
                var height = jqrect.outerHeight();
                return [[pos.left, pos.top], [pos.left + width, pos.top + height]];
            };
        }
        var area = createArea();
        if (typeof(rect) == 'function'){
            area.rect = rect;
        }
        else{
            area.rect = ()=>rect;
        }
        activeAreas.push(area);
        return area;
    }
    
    function updateMove(e){
        var ps = [e.pageX, e.pageY];
        for (var i = 0; i < activeAreas.length; i++){
            var area = activeAreas[i];
            var rect = area.rect();
            if (insideRect(ps, rect[0], rect[1])) {
                area.active = true;
                e.relativeX = e.pageX - rect[0][0];
                e.relativeY = e.pageY - rect[0][1];
                area.updateMove(e);
            }
            else{
                if (area.active){
                    area.active = false;
                    e.relativeX = -1;
                    e.relativeY = -1;
                    area.updateMove(e);
                }
            }
        }
    }
    
    function updateUp(e){
        var ps = [e.pageX, e.pageY];
        for (var i = 0; i < activeAreas.length; i++){
            var area = activeAreas[i];
            var rect = area.rect();
            if (insideRect(ps, rect[0], rect[1])) {
                e.relativeX = e.pageX - rect[0][0];
                e.relativeY = e.pageY - rect[0][1];
                area.updateUp(e);
            }
        }
    }
    
    function updateDown(e){
        var ps = [e.pageX, e.pageY];
        for (var i = 0; i < activeAreas.length; i++){
            var area = activeAreas[i];
            var rect = area.rect();
            if (insideRect(ps, rect[0], rect[1])) {
                e.relativeX = e.pageX - rect[0][0];
                e.relativeY = e.pageY - rect[0][1];
                area.updateDown(e);
            }
        }
    }
    
    function updateMenu(e){
        var ps = [e.pageX, e.pageY];
        for (var i = 0; i < activeAreas.length; i++){
            var area = activeAreas[i];
            var rect = area.rect();
            if (insideRect(ps, rect[0], rect[1])) {
                e.relativeX = e.pageX - rect[0][0];
                e.relativeY = e.pageY - rect[0][1];
                area.updateMenu(e);
            }
        }
    }
    
    $(window).on('mousemove', updateMove).on('mousedown', updateDown).on('mouseup', updateUp).on('contextmenu', updateMenu);
    
    
    events.registerArea = registerArea;
    
//    res = []
//    for (var x = 0; x < 10; x++){
//        var xarr = [];
//        for (var y = 0; y < 10; y++){
//            xarr.push(insideShape([x,y], [[0,0],[7,3],[5,7]]) ? 1 : 0);
//        }
//        res.push(xarr);
//    }
//    console.log(res);
    
})(jQuery);