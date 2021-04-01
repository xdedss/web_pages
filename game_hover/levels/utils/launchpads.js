


// 发射台场景基本setup

define(['image!levels/res/launchpads.png'], function(){
    
    function setSprite(body, srcSize, tgtSize, path){
        body.render.sprite.texture = path;
        body.render.sprite.xScale = tgtSize / srcSize;
        body.render.sprite.yScale = tgtSize / srcSize;
        body.render.sprite.srcSize = srcSize;
        body.render.sprite.targetSize = function(size) {
            this.xScale = size / this.srcSize;
            this.yScale = size / this.srcSize;
        };
    }
    
    
    var setup = function(self, borderHeight) {
        
        if (borderHeight === undefined) borderHeight = 500;
        const bgImg = 'levels/res/launchpads.png';
        const originalH = 1920;
        const originalW = 1920;
        const bgWidth = 500;
        const bgHeight = 500 * originalH / originalW;
        //const borderHeight = 1000;
        const groundLevel = 76 * bgHeight / originalH;
        const minX = 1;
        const maxX = bgWidth - 1;
        const minY = -borderHeight + 1 + groundLevel;
        const maxY = groundLevel - 1;
        
        ((function(){
            this.scene.background = Matter.Bodies.rectangle(bgWidth / 2, -bgHeight / 2 + groundLevel, bgWidth, bgHeight, {
                isStatic : true,
                collisionFilter : {
                    mask : 0
                },
                zindex : -10,
            })
            setSprite(this.scene.background, originalW, bgWidth, bgImg);
            this.scene.backgroundcolor = Matter.Bodies.rectangle(bgWidth / 2, -borderHeight / 2 , bgWidth, borderHeight, {
                isStatic : true,
                render : {
                    fillStyle : '#4580f0',
                },
                collisionFilter : {
                    mask : 0
                },
                zindex : -20,
            })
            
            // background and walls
            this.scene.ground = Matter.Bodies.rectangle(bgWidth / 2, 100, bgWidth + 200, 200, {
                isStatic : true,
                render : { 
                    fillStyle : 'transparent',
                },
                friction : 0.8,
            });
            this.scene.lborder = Matter.Bodies.rectangle(-100, -borderHeight / 2, 200, borderHeight, {
                isStatic : true,
                isSensor : true,
                render : { 
                    fillStyle : 'none',
                },
                friction : 0.0,
                isBorder : true,
            });
            this.scene.rborder = Matter.Bodies.rectangle(bgWidth+100, -borderHeight / 2, 200, borderHeight, {
                isStatic : true,
                isSensor : true,
                render : { 
                    fillStyle : 'none',
                },
                friction : 0.0,
                isBorder : true,
            });
            this.scene.uborder = Matter.Bodies.rectangle(bgWidth / 2, -borderHeight + groundLevel - 100, bgWidth + 200, 200, {
                isStatic : true,
                isSensor : true,
                render : { 
                    fillStyle : 'none',
                },
                friction : 0.0,
                isBorder : true,
            });
            
            // cam limit
            this.matter.engine.camLimit.maxX = maxX;
            this.matter.engine.camLimit.minX = minX;
            this.matter.engine.camLimit.maxY = maxY;
            this.matter.engine.camLimit.minY = minY;
            this.matter.engine.camLimit.maxSize = 200;
            this.matter.engine.camLimit.minSize = 50;
        }).bind(self))();
    };
    return {
        setup,
    };
});


