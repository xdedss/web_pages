

presets = {
    free: 'return 0;',
    constant: 'return 0.5;',
    spring: 'return -x;',
    nspring: 'return x;',
    damping: 'return -u;',
    ndamping: 'return u;',
    friction: 'return -Math.sign(u) * 0.4;',
    nfriction: 'return Math.sign(u) * 0.4;',
    pd1: 'return -1 * x - 1 * u;',
    pd2: 'return -2 * x - 0.5 * u;',
    pd3: 'return -0.5 * x - 2 * u;',
    comb1: 'return -1 * x + 0.5 * u;',
    comb2: 'return 1 * x - 0.5 * u;',
    comb3: 'return -u + 0.5',
    comb4: 'return -x + 0.5',
    comb5: 'return -1 * x - 1 * u + 0.3;',
}



function fxy_eval(f, x, y, lim){
    var res = f(x, y);
    if (res > lim) return lim;
    if (res < -lim) return -lim;
    return res;
}

var step=0;
var input_fxy = document.getElementById('fxy');
var div_intro = document.getElementById('intro');
var exposed = {};

$(function() {
    
    var header = 36;
    var maxH = $(window).width() / 2 / 3 * 4;
    var H = Math.min($(window).height() - 5 - header, maxH);
    var W = H / 4 * 3;//Math.min(document.body.offsetWidth, 540);
    
    updateList = [];
    removeList = [];
    
    $(div_intro).css('left', W + 'px').css('top', header + 'px');
    $('#cover').css('top', header + 'px').css('width', W + 'px');
    $('#two').css('top', header + 'px');
    
    var type = 'canvas';
    var two = new Two({
        type: Two.Types[type],
        width: W,
        height: H,
        autostart: true
    }).appendTo(document.getElementById('two'));
    
    
    deg2rad = 3.141592653589793 / 180.0;
    
    two.makeArrow = function(start, len, direction_radians, headlen, fill){
        if (headlen === undefined) headlen = 10;
        if (fill === undefined) fill = 'black';
        
        var line = this.makeLine(0, 0, len, 0);
        var head = this.makePath(len - headlen, headlen/3, len, 0, len - headlen, -headlen/3, true);
        line.stroke = fill;
        head.fill = fill;
        head.stroke = fill;
        
        var arrow = this.makeGroup(line, head);
        arrow.translation = start;
        arrow.line = line;
        arrow.head = head;
        arrow.headlen = headlen;
        arrow.move = function(new_len, new_dir){
            if (new_len < 0){
                return this.move(-new_len, new_dir + 180*deg2rad)
            }
            this.line.vertices[1].set(new_len, 0);
            this.head.vertices[0].set(new_len - this.headlen, this.headlen/3);
            this.head.vertices[1].set(new_len, 0);
            this.head.vertices[2].set(new_len - this.headlen, -this.headlen/3);
            this.head.translation = v2(0, 0);
            this.rotation = new_dir;
            this.head.opacity = new_len < 1 ? 0 : 1;
        }
        arrow.changeColor = function(new_color, new_opacity){
            this.line.stroke = new_color;
            this.head.fill = new_color;
            this.head.stroke = new_color;
            this.line.opacity = new_opacity;
            this.head.opaticy = new_opacity;
        }
        arrow.move(len, direction_radians);
        return arrow;
    }
    
    two.makeDashline = function(start, end, w_1, w_0){
        if (w_1 + w_0 <= 0){
            w_1 = 1;
            w_0 = 1;
        }
        var lines = [];
        var flag = true;
        var progress = 0;
        var length = start.sub(end).length();
        var last = false;
        var dashline = this.makeGroup();
        while (true){
            var nextw = flag ? w_1 : w_0;
            if (progress + nextw >= length){
                nextw = length - progress;
                last = true;
            }
            if (flag){
                var p1 = v2(start).lerp(end, progress / length);
                var p2 = v2(start).lerp(end, (progress+nextw) / length);
                var line = this.makeLine(p1.x, p1.y, p2.x, p2.y);
                lines.push(line);
                dashline.add(line);
            }
            progress += nextw;
            flag = !flag;
            
            if (last){
                break;
            }
        }
        dashline.lines = lines;
        dashline.changeColor = function(new_color){
            for (var i = 0; i < this.lines.length; i++){
                this.lines[i].stroke = new_color;
            }
        }
        return dashline;
    }
    
    two.makeText = function(text, pos){
        var text = new Two.Text(text, pos.x, pos.y);
        this.add(text);
        return text;
    }
    
    function v2(x, y){
        if (y === undefined) return new Two.Vector().copy(x);
        return new Two.Vector(x, y);
    }
    
    todo = {
        list:[],
        
        add:function(f){
            this.list.unshift(f);
        },
        
        doAll:function(){
            while(this.list.length > 0){
                this.list.pop()();
            }
        }
    }
    
    addRigidbody = function(pos, fxy){
        var ball = two.makeCircle(0, 0, 4);
        chartRoot.add(ball);
        //ball.translation = v2(pos.x * chartW / 2, -pos.y * chartW / 2);
        ball.uxy = uxy;
        var traceTimeElapsed = 0;
        var traceTime = 0.1;
        ball.init = function(pos, fxy){
            ball.xC = pos.x;
            ball.yC = pos.y;
            ball.xI = pos.x;
            ball.yI = pos.y;
            ball.fxy = fxy;
        }
        ball.init(pos, fxy);
        ball.update = function(){
            //console.log(this.xC);
            if (Math.abs(this.xC) > 1 || Math.abs(this.yC) > 4){
                return;
            }
            var dt = Math.min(two.timeDelta / 1000, 0.5);
            var xC, yC;
            for (var i = 0; i < simSteps; i++){
                var yC = this.yC + fxy_eval(this.fxy, this.xC, this.yC, alimit) * dt / simSteps;
                var xC = this.xC + this.uxy(this.xC, this.yC) * dt / simSteps;
                this.xC = xC;
                this.yC = yC;
            }
            this.yC = Math.abs(yC) < 1.0e-3 ? 0 : yC;//friction
            this.translation = v2(xC * chartW / 2, -yC * chartW / 2);
            traceTimeElapsed += dt;
            if (traceTimeElapsed > traceTime){
                addTrace(v2(xC, yC), 10, '#000', 0.25);
                traceTimeElapsed -= traceTime;
            }
            if (Math.abs(xC) > 1 || Math.abs(yC) > 4){
                that = this;
                window.setTimeout(function(){
                    if (Math.abs(that.xC) > 1 || Math.abs(that.yC) > 4){
                        that.xC = that.xI; that.yC = that.yI;
                    }
                }, 500);
            }
        }
        updateList.push(ball);
        return ball;
    }
    
    addTrace = function(pos, life, fill, opacity){
        var ball = two.makeCircle(0, 0, 2);
        ball.stroke = 'none';
        ball.fill = fill;
        chartRoot.add(ball);
        ball.translation = v2(pos.x * chartW / 2, -pos.y * chartW / 2);
        ball.life = life;
        ball.timeElapsed = 0;
        ball.maxOpacity = opacity;
        ball.update = function(){
            this.timeElapsed += two.timeDelta / 1000;
            var t = this.timeElapsed / this.life;
            this.opacity = (1 - t) * this.maxOpacity;
            if (t > 1){
                //this.opacity = 1;
                removeList.push(this);
                chartRoot.remove(this);
            }
        }
        updateList.push(ball);
        return ball;
    }
    
    exposed.gotoStep = function(stepnum){
        $('.step-item.active').removeClass('active');
        hideAll = function(){
            for (var i = 0; i < 5; i++){
                $('.visible' + i).css('display', 'none');
            }
        }
        switch(stepnum){
            case 0:
                hideAll();
                $('.visible0').css('display', '');
                $('#step0').addClass('active');
                exposed.changeFunction(presets.free);
                step = 0;
                break;
            case 1:
                hideAll();
                $('.visible1').css('display', '');
                $('#step1').addClass('active');
                exposed.changeFunction(presets.free);
                step = 1;
                break;
            case 2:
                hideAll();
                $('.visible2').css('display', '');
                $('#step2').addClass('active');
                alimit = 100;
                updateField(fxy);
                step = 2;
                break;
            case 3:
                hideAll();
                $('.visible3').css('display', '');
                $('#step3').addClass('active');
                alimit = 100;
                updateField(fxy);
                step = 3;
                break;
            case 4:
                hideAll();
                $('.visible4').css('display', '');
                $('#step4').addClass('active');
                alimit = 0.1;
                updateField(fxy);
                step = 4;
                break;
        }
    }
    
    exposed.changeFunction = function(str){
        console.log(str);
        try{
            fxy = new Function ('x', 'u', str);
            updateField(fxy);
            rigid.fxy = fxy;
            input_fxy.innerHTML = str;
        }
        catch(e){
            console.log(e);
        }
    }
    
    exposed.setSimSteps = function(steps){
        if (steps >= 1 && steps < 100){
            simSteps = steps;
        }
    }
    
    //parameters
    uxy = (x,u)=>u;
    fxy = (x,u)=>0;//initial
    var chartPadding = 20;
    var chartW = W - 2 * chartPadding;
    var axisExtra = 10;
    var colorX = '#666';
    var colorY = '#5a5';
    var colorXY = '#22a';
    var divideCount = 10;
    var vectorScale = 30;
    var simSteps = 2;
    var groundH = 10;
    var alimit = 100;
    
    var mouse = v2(0,0);
    // chart
    var chartRoot = two.makeGroup();
    
    var chartBack = two.makeRectangle(0, 0, chartW, chartW);
    chartRoot.add(chartBack);
    chartBack.stroke = 'none';
    chartBack.fill = '#fff';
    var axisX = two.makeArrow(v2(-chartW/2-axisExtra, 0), chartW+axisExtra*2, 0);
    axisX.changeColor(colorX, 1);
    var labelX = two.makeText('x', v2(chartW / 2, 10));
    labelX.fill = colorX;
    var axisY = two.makeArrow(v2(0, chartW/2+axisExtra), chartW+axisExtra*2, -90*deg2rad);
    axisY.changeColor(colorY, 1);
    var labelY = two.makeText('u', v2(10, -chartW / 2));
    labelY.fill = colorY;
    
    var arrowsX = [];
    var arrowsU = [];
    var arrowsXU = [];
    for (var xi = -divideCount/2+1; xi < divideCount/2; xi++){
        var x = chartW / divideCount * xi;
        var line = two.makeLine(x, -chartW / 2, x, chartW / 2);
        line.stroke = '#ddd';
        chartRoot.add(line);
    }
    for (var yi = -divideCount/2+1; yi < divideCount/2; yi++){
        var y = chartW / divideCount * yi;
        var line = two.makeLine(-chartW / 2, y, chartW / 2, y);
        line.stroke = '#ddd';
        chartRoot.add(line);
    }
    for (var xi = -divideCount/2+1; xi < divideCount/2; xi++){
        for (var yi = -divideCount/2+1; yi < divideCount/2; yi++){
            var xC = -2.0 / divideCount * xi;
            var yC = 2.0 / divideCount * yi;
            var x = chartW / 2.0 * xC;
            var y = chartW / -2.0 * yC;
            arrowX = two.makeArrow(v2(x, y), yC * vectorScale, 0 * deg2rad, 5);
            arrowX.changeColor(colorX, 0.5)
            arrowX.xC = xC; arrowX.yC = yC;
            arrowU = two.makeArrow(v2(x, y), xC * vectorScale, 90 * deg2rad, 5);
            arrowU.changeColor(colorY, 0.5)
            arrowU.xC = xC; arrowU.yC = yC;
            arrowXU = two.makeArrow(v2(x, y), xC * vectorScale, -90 * deg2rad, 5);
            arrowXU.changeColor(colorXY, 0.5)
            arrowXU.xC = xC; arrowXU.yC = yC;
            arrowsX.push(arrowX);
            arrowsU.push(arrowU);
            arrowsXU.push(arrowXU);
            chartRoot.add([arrowX, arrowU, arrowXU]);
        }
    }
    updateField = function(fxy){
        for(var i = 0; i < arrowsU.length; i++){
            var arrowU = arrowsU[i];
            var arrowXU = arrowsXU[i];
            var fu = fxy_eval(fxy, arrowU.xC, arrowU.yC, alimit);
            var fx = uxy(arrowU.xC, arrowU.yC);
            arrowU.move(fu * vectorScale, -90*deg2rad);
            arrowXU.move(Math.sqrt(fu*fu+fx*fx) * vectorScale, Math.atan2(-fu, fx));
        }
    }
    updateField(fxy);
    rigid = addRigidbody(v2(0, 0.5), fxy);
    
    chartRoot.add([axisX, labelX, axisY, labelY]);
    var chartCenterX = W - chartW/2-chartPadding;
    var chartCenterY = chartW/2+chartPadding
    chartRoot.translation = v2(chartCenterX, chartCenterY);
    todo.add(()=>{
        $('canvas').bind('click', function(e){
            relPos = v2((e.offsetX - chartCenterX) / (chartW/2), -(e.offsetY - chartCenterY) / (chartW/2));
            if (Math.abs(relPos.x) < 1 && Math.abs(relPos.y) < 1){
                rigid.init(relPos, fxy);
            }
        }).bind('touchdown', function(e){
            relPos = v2((e.offsetX - chartCenterX) / (chartW/2), -(e.offsetY - chartCenterY) / (chartW/2));
            if (Math.abs(relPos.x) < 1 && Math.abs(relPos.y) < 1){
                rigid.init(relPos, fxy);
            }
        });
    });
    
    //ground
    remainingSpace = H - 2 * chartPadding - chartW;
    groundY = H - remainingSpace / 2;
    groundRoot = two.makeGroup();
    ground = two.makeLine(-chartW / 2, groundH/2+1, chartW / 2, groundH/2+1);
    ground.linewidth = 3;
    groundRoot.add(ground);
    
    sliderRoot = two.makeGroup();
    slider = two.makeRectangle(0, 0, groundH, groundH);
    sliderRoot.arrowX = two.makeArrow(v2(0, 0), 30, 0 * deg2rad, 5);
    sliderRoot.arrowX.changeColor(colorX, 0.5)
    sliderRoot.arrowX.xC = xC; arrowX.yC = yC;
    sliderRoot.arrowU = two.makeArrow(v2(0, 0), 30, 180 * deg2rad, 5);
    sliderRoot.arrowU.changeColor(colorY, 0.5)
    sliderRoot.arrowU.xC = xC; arrowU.yC = yC;
    sliderRoot.labelX = two.makeText('u', v2(0, 10));
    sliderRoot.labelX.fill = colorX;
    sliderRoot.labelU = two.makeText('a', v2(0, 10));
    sliderRoot.labelU.fill = colorY;
    sliderRoot.update = function(){
        var rigidXC = rigid.xC;
        var rigidYC = Math.abs(rigid.yC) < 5e-3 ? 0 : rigid.yC;
        var rigidX = rigid.translation.x;
        this.translation = v2(rigidX, 0);
        var arrowXLen = uxy(rigidXC, rigidYC) * vectorScale * 2;
        var arrowULen = fxy_eval(fxy, rigidXC, rigidYC, alimit) * vectorScale * 2;
        this.arrowX.move(arrowXLen, 0);
        this.arrowU.move(arrowULen, 0);
        this.labelX.translation = v2(arrowXLen, -10);
        this.labelU.translation = v2(arrowULen, -10);
        this.labelX.opacity = Math.abs(arrowXLen) < 5 ? 0 : 1;
        this.labelU.opacity = Math.abs(arrowULen) < 5 ? 0 : 1;
    }
    updateList.push(sliderRoot);
    sliderRoot.add(slider, sliderRoot.arrowX, sliderRoot.arrowU, sliderRoot.labelX, sliderRoot.labelU);
    groundRoot.add(sliderRoot);
    groundRoot.translation = v2(W / 2, groundY);
    
    
    two.update();
    todo.doAll();
    two.bind('update', function() {
        
        for (var i = 0; i < updateList.length; i++){
            var item = updateList[i];
            if (item.update != null){
                item.update();
            }
        }
        while (removeList.length > 0){
            var item = removeList.pop();
            for (var i = 0; i < updateList.length; i++){
                if (updateList[i] === item){
                    updateList.splice(i, 1);
                    break;
                }
            }
        }

    });

    exposed.gotoStep(0);
});

