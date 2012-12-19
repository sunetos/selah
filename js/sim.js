var RAD2DEG = 180.0 / Math.PI;
var DEG2RAD = Math.PI / 180.0;
var Msg;
(function (Msg) {
    var subs = {
    };
    function sub(topic, cb, context) {
        if (typeof context === "undefined") { context = window; }
        (subs[topic] = subs[topic] || []).push([
            cb, 
            context
        ]);
    }
    Msg.sub = sub;
    ; ;
    function unsub(topic, cb, context) {
        if (typeof context === "undefined") { context = window; }
        if(cb) {
            var cbs = subs[topic];
            for(var i = 0; i < cbs.length; ++i) {
                var cbi = cbs[i];
                if(cb === cbi[0] && context === cbi[1]) {
                    cbs.splice(i, 1);
                    --i;
                }
            }
        } else {
            delete subs[topic];
        }
    }
    Msg.unsub = unsub;
    ; ;
    function pub(topic) {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            args[_i] = arguments[_i + 1];
        }
        subs[topic] && subs[topic].forEach(function (cbi) {
            cbi[0].apply(cbi[1], args);
        });
    }
    Msg.pub = pub;
    ; ;
})(Msg || (Msg = {}));
String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};
var Random;
(function (Random) {
    function int(min, max) {
        return ((Math.random() * (max - min + 1)) + min) | 0;
    }
    Random.int = int;
    function choice(items) {
        return items[int(0, items.length - 1)];
    }
    Random.choice = choice;
    function scale(scale) {
        if (typeof scale === "undefined") { scale = 1.0; }
        return Math.random() * scale;
    }
    Random.scale = scale;
    function chance(outOf) {
        if (typeof outOf === "undefined") { outOf = 1; }
        return (int(1, outOf) === 1);
    }
    Random.chance = chance;
    function degree() {
        return int(0, 359);
    }
    Random.degree = degree;
    function radian() {
        return scale(6.283185307179586);
    }
    Random.radian = radian;
})(Random || (Random = {}));
function proxy(context, prop) {
    return context[prop].bind(context);
}
function renewableTimeout(func, delay) {
    var callT = null, callI = delay;
    function callClear() {
        if(callT) {
            clearTimeout(callT);
            callT = null;
        }
    }
    function callSet(overrideI) {
        callClear();
        callT = setTimeout(function () {
            callT = null;
            func();
        }, (overrideI !== undefined) ? overrideI : callI);
    }
    function callRun() {
        callClear();
        func();
    }
    return {
        clear: callClear,
        set: callSet,
        run: callRun
    };
}
var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var b2Vec2 = this.Box2D.Common.Math.b2Vec2;
var b2BodyDef = this.Box2D.Dynamics.b2BodyDef;
var b2Body = this.Box2D.Dynamics.b2Body;
var b2FixtureDef = this.Box2D.Dynamics.b2FixtureDef;
var b2Fixture = this.Box2D.Dynamics.b2Fixture;
var b2World = this.Box2D.Dynamics.b2World;
var b2PolygonShape = this.Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = this.Box2D.Collision.Shapes.b2CircleShape;
var b2WorldManifold = this.Box2D.Collision.b2WorldManifold;
var b2DebugDraw = this.Box2D.Dynamics.b2DebugDraw;
var b2ContactListener = this.Box2D.Dynamics.b2ContactListener;
var b2BodyTypes = {
    'static': b2Body.b2_staticBody,
    'dynamic': b2Body.b2_dynamicBody,
    'kinematic': b2Body.b2_kinematicBody
};
var DEFAULT_GRAVITY = new b2Vec2(0, 9.8);
var World = (function () {
    function World(gravity, debugContext) {
        if (typeof gravity === "undefined") { gravity = DEFAULT_GRAVITY; }
        var _this = this;
        this.M2PIX = 30;
        this.PIX2M = 1.0 / 30;
        this.STEP = 20;
        this.TIMESTEP = 1 / 20;
        this.bodiesToRemove = [];
        this.actors = [];
        this.bodies = [];
        this.paused = false;
        this.lastTimestamp = Date.now();
        this.fixedTimestepAccumulator = 0;
        gravity = new b2Vec2(0, 0);
        this.world = new b2World(gravity, true);
        if(debugContext) {
            this.addDebug(debugContext);
        }
        this.listener = new b2ContactListener();
        this.listener.PostSolve = function (c, i) {
            return _this.postContact(c, i);
        };
        this.world.SetContactListener(this.listener);
        this.setup();
    }
    World.prototype.postContact = function (contact, impulse) {
    };
    World.prototype.makeBody = function (type, w, h, x, y, fixCfg, bodyCfg) {
        var fixDef = new b2FixtureDef();
        if(typeof (w) === 'number') {
            fixDef.shape = new b2PolygonShape();
            (fixDef.shape).SetAsBox(w * this.PIX2M, h * this.PIX2M);
        } else {
            fixDef.shape = new b2CircleShape(h * this.PIX2M);
        }
        if(fixCfg) {
            for(var prop in fixCfg) {
                fixDef[prop] = fixCfg[prop];
            }
        }
        var bodyDef = new b2BodyDef();
        bodyDef.type = b2BodyTypes[type];
        bodyDef.position.x = x * this.PIX2M;
        bodyDef.position.y = y * this.PIX2M;
        if(bodyCfg) {
            for(var prop in bodyCfg) {
                bodyDef[prop] = bodyCfg[prop];
            }
        }
        var body = this.world.CreateBody(bodyDef);
        body.CreateFixture(fixDef);
        if(type !== 'static') {
            this.bodies.push(body);
        }
        return body;
    };
    World.prototype.makeActor = function (skin, w, h, x, y, fixCfg, bodyCfg) {
        skin.x = x;
        skin.y = y;
        skin.snapToPixel = true;
        skin.mouseEnabled = false;
        if(typeof (w) === 'number') {
            skin.regX = w * 0.5;
            skin.regY = h * 0.5;
        } else {
            skin.regX = skin.regY = h;
        }
        var body = this.makeBody('dynamic', w, h, x, y, fixCfg, bodyCfg);
        var actor = new Actor(body, skin, this);
        body.SetUserData(actor);
        this.actors.push(actor);
        return actor;
    };
    World.prototype.setup = function () {
    };
    World.prototype.addDebug = function (debugContext) {
        var debugDraw = new b2DebugDraw();
        debugDraw.SetSprite(debugContext);
        debugDraw.SetDrawScale(this.M2PIX);
        debugDraw.SetFillAlpha(0.7);
        debugDraw.SetLineThickness(1.0);
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
        this.world.SetDebugDraw(debugDraw);
    };
    World.prototype.pause = function () {
        this.paused = true;
    };
    World.prototype.resume = function () {
        this.paused = false;
        this.lastTimestamp = Date.now();
    };
    World.prototype.toggle = function (state) {
        state = (state === undefined) ? !this.paused : state;
        if(state) {
            this.resume();
        } else {
            this.pause();
        }
    };
    World.prototype.update = function () {
        if(this.paused) {
            return;
        }
        var now = Date.now();
        var dt = now - this.lastTimestamp;
        this.fixedTimestepAccumulator += dt;
        this.lastTimestamp = now;
        while(this.fixedTimestepAccumulator >= this.STEP) {
            for(var i = 0, l = this.bodiesToRemove.length; i < l; ++i) {
                this.removeActor(this.bodiesToRemove[i].GetUserData());
                this.bodiesToRemove[i].SetUserData(null);
                this.world.DestroyBody(this.bodiesToRemove[i]);
            }
            this.bodiesToRemove = [];
            for(var i = 0, l = this.actors.length; i < l; ++i) {
                this.actors[i].update();
            }
            this.world.Step(this.TIMESTEP, 10, 10);
            this.fixedTimestepAccumulator -= this.STEP;
            this.world.ClearForces();
            if(this.world.m_debugDraw) {
                this.world.m_debugDraw.m_sprite.graphics.clear();
                this.world.DrawDebugData();
            }
            this.tick();
        }
    };
    World.prototype.tick = function () {
    };
    World.prototype.removeActor = function (actor) {
        stage.removeChild(actor.skin);
        this.actors.splice(this.actors.indexOf(actor), 1);
    };
    return World;
})();
var BirdWorld = (function (_super) {
    __extends(BirdWorld, _super);
    function BirdWorld() {
        _super.apply(this, arguments);

        this.manifold = new b2WorldManifold();
    }
    BirdWorld.prototype.setup = function () {
        var fixCfg = {
            density: 1,
            friction: 0,
            restitution: 1
        };
        var bodyCfg = {
            userData: 'wall'
        };
        var w = 500, h = 500;
        var floor = this.makeBody('static', w, 10, 0, h + 10, fixCfg, bodyCfg);
        var ceil = this.makeBody('static', w, 10, 0, -10, fixCfg, bodyCfg);
        var left = this.makeBody('static', 10, h, -10, 0, fixCfg, bodyCfg);
        var right = this.makeBody('static', 10, h, w + 10, 0, fixCfg, bodyCfg);
    };
    BirdWorld.prototype.makeBird = function (stage) {
        var fixCfg = {
            density: 1,
            friction: 0,
            restitution: 1
        };
        var bodyCfg = {
            bullet: true
        };
        var birdBMP = new createjs.Bitmap('img/bird.png');
        stage.addChild(birdBMP);
        var radius = 25;
        var x = Random.int(radius * 2, 500 - radius * 2), y = Random.int(radius * 2, 500 - radius * 2);
        var actor = this.makeActor(birdBMP, 'circle', radius, x, y, fixCfg, bodyCfg);
        var scale = 5;
        var xd = Math.cos(Random.radian()) * scale, yd = Math.sin(Random.radian()) * scale;
        var spawnDir = new b2Vec2(xd, yd);
        actor.body.ApplyImpulse(spawnDir, actor.body.GetWorldCenter());
        actor.onUpdate = function () {
            var vel = actor.body.GetLinearVelocity();
            var speed = vel.Length();
            if(speed != scale) {
                if(speed) {
                    vel.Multiply(scale / speed);
                } else {
                    vel.Normalize();
                    vel.Multiply(speed);
                }
                actor.body.SetLinearVelocity(vel);
            }
        };
    };
    BirdWorld.prototype.tick = function () {
        if(this.bodies.length > 4) {
            this.bodiesToRemove.push(this.bodies[0]);
            this.bodies.splice(0, 1);
        }
    };
    BirdWorld.prototype.postContact = function (contact, impulse) {
        var ud1 = contact.GetFixtureA().GetBody().GetUserData(), ud2 = contact.GetFixtureB().GetBody().GetUserData();
        if(ud1 === 'wall' || ud2 === 'wall') {
            contact.GetWorldManifold(this.manifold);
            var point = this.manifold.m_points[0];
            var x = this.PIX2M * point.x, y = this.PIX2M * point.y;
            Msg.pub('wall-touch', x, y);
        }
    };
    return BirdWorld;
})(World);
var Actor = (function () {
    function Actor(body, skin, world) {
        this.body = body;
        this.world = world;
        this.skin = skin;
    }
    Actor.prototype.update = function () {
        this.skin.rotation = this.body.GetAngle() * RAD2DEG;
        this.skin.x = this.body.GetWorldCenter().x * this.world.M2PIX;
        this.skin.y = this.body.GetWorldCenter().y * this.world.M2PIX;
        this.onUpdate();
    };
    Actor.prototype.onUpdate = function () {
    };
    return Actor;
})();
function createBgGrid(stage, numX, numY) {
    var grid = new createjs.Container();
    grid.snapToPixel = true;
    var w = stage.canvas.width, h = stage.canvas.height;
    var gw = w / numX, gh = h / numY;
    var verticalLine = new createjs.Graphics();
    verticalLine.beginFill(createjs.Graphics.getRGB(100, 100, 100));
    verticalLine.drawRect(0, 0, gw * 0.02, gh * (numY + 2));
    var vs;
    for(var c = -1; c < numX + 1; ++c) {
        vs = new createjs.Shape(verticalLine);
        vs.snapToPixel = true;
        vs.x = c * gw;
        vs.y = -gh;
        grid.addChild(vs);
    }
    var horizontalLine = new createjs.Graphics();
    horizontalLine.beginFill(createjs.Graphics.getRGB(100, 100, 100));
    horizontalLine.drawRect(0, 0, gw * (numX + 1), gh * 0.02);
    var hs;
    for(c = -1; c < numY + 1; ++c) {
        hs = new createjs.Shape(horizontalLine);
        hs.snapToPixel = true;
        hs.x = 0;
        hs.y = c * gh;
        grid.addChild(hs);
    }
    stage.addChild(grid);
    return grid;
}
//@ sourceMappingURL=sim.js.map
