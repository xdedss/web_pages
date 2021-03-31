
// Level的基类

define([], function(){
    class Level{
        constructor(app) {
            var {ui, matter} = app;
            this.matter = matter;
            this.ui = ui;
            this.scene = {};
            
            this.init();
            this.postInit();
        }
        
        // 初始化
        init () {
            
        }
        
        // 后初始化
        postInit () {
            // add all bodies to world
            var bodies = [];
            for (var k in this.scene) {
                if (this.scene[k].parent == this.scene[k] && !this.scene[k].skip){
                    bodies.push(this.scene[k]);
                }
            }
            bodies.sort((a, b) => {
                a = (a.zindex == null) ? 0 : a.zindex;
                b = (b.zindex == null) ? 0 : b.zindex;
                return a - b;
            });
            //console.log(bodies);
            Matter.World.add(this.matter.world, bodies);
            // add collision listener
            
            ((that) => {
                this._collision = function({ pairs }) {
                    that.onCollision(pairs);
                };
            })(this);
            Matter.Events.on(this.matter.engine, 'collisionStart', this._collision);
            this.reset();
        }
        
        // 重设各个物体的位置
        reset () {
            
        }
        
        // undo初始化里面干的事情
        terminate () {
            var { engine, world, render, mouse, mConstraint } = this.matter;
            for (var k in this.scene) {
                Matter.Composite.remove(world, this.scene[k]);
            }
            Matter.Events.off(this.matter.engine, 'collisionStart', this._collision);
        }
        
        // 物理帧
        tick() {
            
        }
        
        // 碰撞
        onCollision(pairs) {
            
        }
        
        // 用户提交代码
        exec (code, factory) {
            
        }
        
        template = "\nconsole.log('hello world');\n";
        desc = "no description provided.";
        documentation = {
            foo : {
                type : 'function',
                desc : 'some function',
                params : {
                    bar : {
                        type : 'float',
                        desc : 'some parameter',
                    },
                },
            },
            obj : {
                type : 'object',
                desc : 'some object',
                children : {
                    x : {
                        type : 'float',
                        desc : 'child of obj',
                    },
                },
            },
        };
    }
    return Level;
});


