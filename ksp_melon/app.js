

//°

$(function(){
    
    var debug = false;
    var mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var srcSize = 200;
    var width = 720;
    var height = 720;
    var padding = 5;
    var minSize = 10;
    var maxSize = 140;
    var minMass = 0.25;
    var gravity = 1e-3;
    var gravityR = 80;
    var borderRadius = 280;
    var borderForce = 2e-3;
    var borderFriction = 1e-3;
    var maxExcessCount = 60 * 5;
    //var bodies = ['Gilly', 'Pol', 'Minmus', 'Bop', 'Ike', 'Dres', 'Mun', 'Eeloo', 'Moho', 'Vall', 'Duna', 'Laythe', 'Kerbin', 'Tylo', 'Eve', 'Jool', 'Kerbol']
    var bodies = ['Gilly', 'Minmus', 'Bop', 'Dres', 'Mun', 'Eeloo', 'Moho', 'Duna', 'Laythe', 'Kerbin', 'Eve', 'Jool', 'Kerbol']
    
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    function clamp(f, f1, f2){
        return Math.max(Math.min(f, Math.max(f1, f2)), Math.min(f1, f2));
    }
    function lerp(f1, f2, t){
        return f1 * (1-t) + f2 * t;
    }
    
    function inBound(pos){
        var {x, y} = pos;
        return x >= padding && x <= width - padding && y >= padding && y <= height - padding;
    }
    
    // module aliases
    Matter.use(
        'matter-attractors'
    );
    var Engine = Matter.Engine,
        Render = Matter.Render,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Mouse = Matter.Mouse,
        MouseConstraint = Matter.MouseConstraint,
        Events = Matter.Events;

    // create an engine
    var engine = Engine.create({
        enableSleeping : false,
    });
    
    // world
    var world = engine.world;
    world.gravity.x = 0;
    world.gravity.y = 0;

    // create a renderer
    var render = Render.create({
        element : document.body,
        engine : engine,
        options : {
            width : width,
            height : height,
            pixelRatio : 'auto',
            background : 'url("images/bg.png")',
            wireframe : debug,
            hasBounds : false,
            enabled : true,
            wireframes : debug,
            showSleeping : debug,
            showDebug : debug,
            showBroadphase : false,
            showBounds : false,
            showVelocity : debug,
            showCollisions : debug,
            showSeparations : false,
            showAxes : false,
            showPositions : false,
            showAngleIndicator : debug,
            showIds : false,
            showShadows : false,
            showVertexNumbers : false,
            showConvexHulls : false,
            showInternalEdges : false,
            showMousePosition : false
        }
    });
    //Matter.Render.setPixelRatio(render, 'auto')
    console.log(render.options.pixelRatio)
    
    // ball object
    function createBall(x, y, r, sprite){
        var res = Bodies.circle(x, y, r, { 
            render : { 
//                sprite : { 
//                    texture : 'images/'+sprite+'_crop.png',
//                    xOffset : 0,
//                    yOffset : 0,
//                    xScale : 2*r / srcSize,
//                    yScale : 2*r / srcSize,
//                }
            }
        });
        setCircleSprite(res, r, sprite);
        return res;
    }
    
    function getRadius(idx){
        return minSize * Math.pow(maxSize / minSize, idx / (bodies.length - 1));
    }
    
    function getMass(idx){
        return Math.pow(2., idx) * minMass;
    }
    
    function setCircleSprite(body, r, sprite){
        body.render.sprite.texture = 'images/'+sprite+'_crop.png';
        body.render.sprite.xScale = 2*r / srcSize;
        body.render.sprite.yScale = 2*r / srcSize;
    }
    
    // create and add celestial body
    function addBody(x, y, idx){
        var startRadius = getRadius(idx - 1);
        var targetRadius = getRadius(idx);
        //console.log(idx);
        var ball = createBall(x, y, startRadius, bodies[idx]);
        ball.ballSize = idx;
        ball.massCache = getMass(idx);
        ball.currentRadius = startRadius;
        ball.targetRadius = targetRadius;
        ball.isInside = false;
        (async function(){
            await sleep(3000);
            if (ball != null) ball.isInside = true;
        })();
        Matter.Body.setMass(ball, ball.massCache);
        //console.log(ball);
        World.add(world, [ball]);
        sizeRecord = Math.max(sizeRecord, idx);
        return ball;
    }
    
    // merge 2 celestial bodies
    async function startMerge(ballA, ballB){
        var size = ballA.ballSize;
        var ax = ballA.position.x;
        var ay = ballA.position.y;
        var bx = ballB.position.x;
        var by = ballB.position.y;
        var cx = (ax + bx) / 2;
        var cy = (ay + by) / 2;
        ballA.ballSize = null;
        ballB.ballSize = null;
        ballA.isStatic = true;
        ballB.isStatic = true;
        var frames = 8;
        for (var i = 0; i < frames; i++){
            await sleep(20);
            var t = Math.sqrt(i / frames);
            ballA.position.x = lerp(ax, cx, t);
            ballA.position.y = lerp(ay, cy, t);
            ballB.position.x = lerp(bx, cx, t);
            ballB.position.y = lerp(by, cy, t);
        }
        Matter.Composite.remove(world, ballA);
        Matter.Composite.remove(world, ballB);
        score += 2 ** size;
        $('#score').text(score);
        addBody(cx, cy, size + 1);
    }
    
    // mass center
    function getMassCenter(){
        var allBodies = Matter.Composite.allBodies(world);
        var cx = 0;
        var cy = 0;
        var n = 0;
        allBodies.forEach(b => {
            if (b.ballSize != null){
                cx += b.position.x * b.mass;
                cy += b.position.y * b.mass;
                n += b.mass;
                //console.log(b.mass);
            }
        });
        return n == 0 ? { x : width / 2, y : height / 2 } : { x : cx / n, y : cy / n };
    }
    
    function clampBorder(x, y){
        x = clamp(x, padding, width - padding);
        y = clamp(y, padding, height - padding);
        var rx = x - gravityPoint.position.x;
        var ry = y - gravityPoint.position.y;
        var r = Math.sqrt(rx*rx + ry*ry);
        r = r == 0 ? 1e-5 : r;
        return {
            x : r > borderRadius ? x : rx / r * borderRadius + gravityPoint.position.x,
            y : r > borderRadius ? y : ry / r * borderRadius + gravityPoint.position.y
        };
    }
    
    function gg(){
        isOver = true;
        gravityPoint.render.visible = false;
        preview.render.visible = false;
        groundU.collisionFilter.mask = 0;
        groundD.collisionFilter.mask = 0;
        groundL.collisionFilter.mask = 0;
        groundR.collisionFilter.mask = 0;
        crash = Bodies.rectangle(width/2, height/2, 10, 10, {
            isStatic : true,
            collisionFilter : {
                mask : 0
            },
            render : { 
                sprite : {
                    texture : 'images/kspcrash.png',
                    xScale : 0,
                    yScale : 0,
                }
            }
        });
        World.add(world, [crash]);
        (async function(){
            var targetScale = mobile ? 0.8 : 1.0;
            for (var i = 0; i < 10; i++){
                var t = i / 10;
                if (crash != null){
                    crash.render.sprite.xScale = lerp(0.4, targetScale, t);
                    crash.render.sprite.yScale = lerp(0.4, targetScale, t);
                }
                await sleep(20);
            }
        })()
    }
    
    // ---------- init ------------
    var sizeRecord;
    var nextIdx;
    var excessCount;
    var isOver;
    var score;
    var preview, crash, gravityPoint, groundU, groundD, groundL, groundR;
    function restart(){
        Matter.Composite.allBodies(world).forEach(body=>{
            Matter.Composite.remove(world, body);
        });
        $('#score').text('0');
        sizeRecord = 0;
        nextIdx = 4;
        excessCount = 0;
        isOver = false;
        score = 0;
        preview = Bodies.circle(width / 2, 20, 10, {
            isStatic : true,
            collisionFilter : {
                mask : 0
            },
            render : { 
                opacity : 0.6,
            },
        });
        setCircleSprite(preview, getRadius(nextIdx), bodies[nextIdx]);
        gravityPoint = Bodies.circle(width / 2, height / 2, borderRadius, {
            isStatic : true,
            collisionFilter : {
                mask : 0
            },
            render : { 
                fillStyle : 'none',
                lineWidth : 2,
                strokeStyle : '#fff',
                opacity : 0.5,
            },
            plugin : {
                attractors : [
                    function(bodyA, bodyB) {
                        var rx = bodyA.position.x - bodyB.position.x;
                        var ry = bodyA.position.y - bodyB.position.y;
                        var r2 = (rx*rx + ry*ry);
                        var r = Math.sqrt(r2);
                        var dirx = r == 0 ? 0 : rx / r;
                        var diry = r == 0 ? 0 : ry / r;
                        var F = (r > gravityR ? (gravityR*gravityR/r2) * gravity : r / gravityR * gravity) * bodyB.mass;
                        var reverse = isOver ? -1 : 1;
                        return {
                            x : dirx * F * reverse,
                            y : diry * F * reverse,
                        };
                    }
                ]
            }
        });
        groundU = Bodies.rectangle(width/2, 0, width, padding*2, { isStatic: true, render:{fillStyle:'#fff'}  });
        groundD = Bodies.rectangle(width/2, height, width, padding*2, { isStatic: true, render:{fillStyle:'#fff'}  });
        groundL = Bodies.rectangle(0, height/2, padding*2, height, { isStatic: true, render:{fillStyle:'#fff'}  });
        groundR = Bodies.rectangle(width, height/2, padding*2, height, { isStatic: true, render:{fillStyle:'#fff'}  });

        World.add(world, [preview, gravityPoint, groundU, groundD, groundL, groundR]);
        
        // initial kerbin
        console.log(addBody(width / 2, height / 2, 9));
    }
    restart();
    
    
    // collision listener
    Matter.Events.on(engine, 'collisionStart', ({ pairs }) => {
        if (isOver) return;
        pairs.forEach(({ bodyA, bodyB }) => {
            if (bodyA.ballSize != null && bodyB.ballSize != null){
                //console.log(bodyA);
                if (bodyA.ballSize == bodyB.ballSize && bodyA.ballSize < bodies.length - 1){
                    startMerge(bodyA, bodyB);
                }
                
            }
        });
    });
    
    //mouse listener
    var canvasMouse = Mouse.create(document.querySelector('canvas'));
    var mConstraint = MouseConstraint.create(engine, { mouse: canvasMouse });
    Events.on(mConstraint, "mouseup", function(event) {
        //console.log(event.mouse);
        var {x, y} = event.mouse.position;
        x *= event.mouse.pixelRatio / render.options.pixelRatio;
        y *= event.mouse.pixelRatio / render.options.pixelRatio;
        if (isOver) {
            restart();
            
        }
        else{
            var { x, y } = clampBorder(x, y);
            addBody(x, y, nextIdx);
            
            nextIdx = Math.floor(Math.random() * 7);
            setCircleSprite(preview, getRadius(nextIdx), bodies[nextIdx]);
        }
    });
//    Events.on(mConstraint, "mousemove", function(event) {
//        //console.log(event.mouse);
//        var {x, y} = event.mouse.position;
//        x /= render.options.pixelRatio;
//        y /= render.options.pixelRatio;
//        
//        console.log(x, y);
//
//    });
    
    Events.on(engine, 'tick', function(event) {
        if (isOver) return;
        // update animation
        var exceed = false;
        Matter.Composite.allBodies(world).forEach(body=>{
            if (body.ballSize != null){
                if (body.currentRadius < body.targetRadius){
                    var scale = Math.min(body.targetRadius / body.currentRadius, 1.01);
                    //console.log(scale, body.currentRadius);
                    body.currentRadius *= scale;
                    body.render.sprite.xScale = 2 * body.currentRadius / srcSize;
                    body.render.sprite.yScale = 2 * body.currentRadius / srcSize;
                    Matter.Body.scale(body, scale, scale);
                    Matter.Body.setMass(body, body.massCache);
                }
                var rx = body.position.x - gravityPoint.position.x;
                var ry = body.position.y - gravityPoint.position.y;
                var r2 = rx*rx + ry*ry;
                var r = Math.sqrt(r2);
                if (!inBound(body.position)){
                    // outside the screen
                    Matter.Composite.remove(world, body);
                }
                else if (r + body.targetRadius > borderRadius){
                    // outside the border
                    if (body.isInside){
                        var dirx = rx / r;
                        var diry = ry / r;
                        var vx = body.velocity.x;
                        var vy = body.velocity.y;
                        Matter.Body.applyForce(body, body.position, { 
                            x : (-dirx * borderForce - vx * borderFriction) * body.mass, 
                            y : (-diry * borderForce - vy * borderFriction) * body.mass
                        });
                        exceed = true;
                    }
                }
                else{
                    body.isInside = true;
                }
            }
        });
        // update COM
        var { x, y } = getMassCenter();
        var t = 0.4;
        x = lerp(x, width / 2, t);
        y = lerp(y, height / 2, t);
        gravityPoint.position.x = x;
        gravityPoint.position.y = y;
        gravityPoint.render.strokeStyle = exceed ? '#f88' : '#fff';
        excessCount = exceed ? excessCount + 1 : 0;
        gravityPoint.render.fillStyle = `rgba(255, 0, 0, ${clamp(excessCount / maxExcessCount, 0, 1)})`;
        if (excessCount >= maxExcessCount) gg();
        // mouse
        if (!mobile){
            var { x, y } = clampBorder(canvasMouse.position.x / render.options.pixelRatio, 
                canvasMouse.position.y / render.options.pixelRatio);
            preview.position.x = x;
            preview.position.y = y;
        }
        
        //console.log(rx, ry);
    });

    // run the engine
    Engine.run(engine);

    // run the renderer
    Render.run(render);
    
    if (mobile && $(window).width() < width){
        $('canvas').css('margin-left', (-(width - $(window).width()) / 2) + 'px');
    }
    
    if (mobile){
        (async function(){
            await sleep(500);
            alert('手机可能显示不全，建议用电脑打开');
        })()
    }
    
    // update gravity center
//    (async function(){
//        while (true){
//            await sleep(100);
//            var { x, y } = getMassCenter();
//            var t = 0.4;
//            x = lerp(x, width / 2, t);
//            y = lerp(y, height / 2, t);
//            gravityPoint.position.x = x;
//            gravityPoint.position.y = y;
//        }
//        
//    })()
});
