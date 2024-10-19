var FORCE_STOP_ENGINE_TICK_FUNCTION = true;
var STOP_ON_NEXT_TICK = true;
var DRAW_TAS_INFO = true;
var replay = false;
var replay_line=0;
var stop_replay=false;

var tas_textarea_persist=false;

var lnzrl=0;

var GLOBAL_TICK_RO=0;
var tas_loadLevel_tick=0;

//var TEST = {};

var GLOBAL_KEYS_DOWN = {};
var NEW_KEYS_DOWN = {};

function tf(s){
	if(s==="1"){
		return true;
	}else{
		return false;
	}
}

function cta(s){
	if(s==="S"){
		tas_textarea_persist=true;
		
		replay=true;
		FORCE_STOP_ENGINE_TICK_FUNCTION = false;
		STOP_ON_NEXT_TICK = true;
	}else if(s==="P"){
		stop_replay=true;
	}
}

function REPLACE_FROM_CONSOLE(orig){
	if(replay_line!==0){
		lnzrl=replay_line;
	}
	lines = document.getElementById("keyoutputid").value.split("\n");
	var rfc=true;
	while(rfc){
		//console.log(lines);
		if(replay_line < lines.length){
		if(lines[replay_line].at(0)==="0"||lines[replay_line].at(0)==="1"){
			rfc=false;
			orig[KEY_LEFT] = tf(lines[replay_line].at(0));
			orig[KEY_RIGHT] = tf(lines[replay_line].at(1));
			orig[KEY_JUMP] = tf(lines[replay_line].at(2));
			orig[KEY_SHOOT] = tf(lines[replay_line].at(3));
			STOP_ON_NEXT_TICK=true;
			FORCE_STOP_ENGINE_TICK_FUNCTION=false;
			replay_line++;
			replay=true;
		}else if(replay_line >= lines.length){
			STOP_ON_NEXT_TICK=true;
			FORCE_STOP_ENGINE_TICK_FUNCTION=true;
			rfc=false;
			replay=false;
		}else{
			replay_line++;
		}
	}else{
		replay=false;
		rfc=false;
		STOP_ON_NEXT_TICK=true;
		FORCE_STOP_ENGINE_TICK_FUNCTION=true;
	}
	}
	//console.log(replay_line);
	return orig;
}

function GameStorage(a) {
    this.works = !0;
    this.tempStorage = {};
    try {
        if (!localStorage.getItem("version") && (localStorage.setItem("version", a), !localStorage.getItem("version"))) throw "grenade";
    } catch (b) {
        this.works = !1
    }
    this.works ? Number(localStorage.getItem("version")) !== a && (localStorage.clear(), console.log("Storage cleared because of game update to version " + a)) : this.setItem("version", a)
}
GameStorage.prototype.setItem = function(a, b) {
    b = JSON.stringify(b);
    this.works ? localStorage.setItem(a, b) : this.tempStorage[a] = b
};
GameStorage.prototype.removeItem = function(a) {
    this.works ? localStorage.removeItem(a) : delete this.tempStorage[a]
};
GameStorage.prototype.getItem = function(a) {
    return this.works ? JSON.parse(localStorage.getItem(a)) : this.tempStorage[a] ? JSON.parse(this.tempStorage[a]) : null
};
Object.deepcopy = function(a) {
    function b(a, c, f, m) {
        var h;
        if ("object" == typeof a) {
            if (null == a) return a;
            for (h in d)
                if (d[h] === a) return g.push({
                    resolveTo: h,
                    child: f,
                    i: m
                }), null;
            d[c] = a;
            Object.isArray(a) ? f = [] : (f = {}, f.__proto__ = a.__proto__);
            for (h in a) f[h] = b(a[h], c + "[" + h + "]", f, h);
            e[c] = f
        } else f = a;
        return f
    }
    var c, d = {},
        e = {},
        g = [];
    a = b(a, "*");
    for (c in g) {
        var f = g[c];
        f && f.child && f.i in f.child && (f.child[f.i] = e[f.resolveTo])
    }
    return a
};
var DEBUG = !0,
    RIGHT = 0,
    LEFT = 1,
    NOT_FALLING = 0,
    IN_JUMP = 1,
    FALLING = 2,
    GAME_WIDTH = 800,
    GAME_HEIGHT = 600,
    FIRST_LEVEL = "level1.js",
    LEVEL_DIR = "levels/",
    STORAGE_NO_AUDIO = "no_audio",
    STORAGE_LEVEL = "last_level",
    STORAGE_STATE = "state";
window.addEventListener("load", function() {
    var a = new GameEngine;
    DEBUG && "localhost" === location.host && window.LevelEditor && new LevelEditor(a)
}, !1);

function GameEngine() {
    this.version = .02;
    this.width = GAME_WIDTH;
    this.height = GAME_HEIGHT;
    this.storage = new GameStorage(this.version);
    this.storage.works || dbg_warn("localStorage not supported. Your game will not be saved.");
    this.keyboard = new KeyboardManager(this);
    this.renderer = new GameRenderer(this);
    this.audio = new AudioManager(!this.storage.getItem(STORAGE_NO_AUDIO));
    this.audio.works || dbg_warn("Your browser does not support HTML5 audio or ogg/vorbis");
    this.posY = this.posX = this.viewportY = this.viewportX = null;
    this.lastTick = Date.now();
    this.totalDelta = 0;
    this.running = this.drawableObjects = this.blockingObjects = this.triggeringObjects = this.objectMap = this.objects = this.charBitmap = this.vspeed = this.direction = this.canJump = this.fallingState = this.tickCount = null;
    this.tickFunctionStopped = !0;
    this.isMoving = null;
    this.images = {};
    this.drawHooks = this.gameData = null;
    this.levelFile = this.storage.getItem(STORAGE_LEVEL);
    var a = this;
    document.getElementById("mute_button").addEventListener("click", function() {
        a.toggleMute()
    }, !1);
    document.getElementById("reset_save").addEventListener("click",
        function() {
            a.nextLevel(FIRST_LEVEL)
        }, !1);
    this.levelFile || (this.levelFile = FIRST_LEVEL);
    this.loadLevel(this.levelFile)
}
GameEngine.prototype.nextLevel = function(a) {
	console.log(document.getElementById("keyoutputid").value);
    tas_loadLevel_tick = GLOBAL_TICK_RO;
	this.levelFile = a;
    this.storage.setItem(STORAGE_LEVEL, a);
    this.storage.removeItem(STORAGE_STATE);
    this.loadLevel(a)
};
GameEngine.prototype.loadLevel = function(a) {
    var b = this;
    this.running = !1;
    http_get(LEVEL_DIR + a + "?" + Math.random(), function(a) {
        a = eval(a);
        if (!a) throw "level not found";
        b.level = a;
        b.loadResources(a)
    })
};
GameEngine.prototype.loadResources = function(a) {
    function b() {
        g++;
        return function() {
            f++;
            h.renderer.drawLoadingScreen(f, g);
            g === f && h.start()
        }
    }

    function c() {
        throw "loading a resource failed. Will not start";
    }
    var d = a.resourceDir,
        e = Object.keys(a.images),
        g = 0,
        f = 0,
        h = this;
    this.audio.path = a.musicDir;
    this.level = a;
    this.audio.preload(this.level.jumpMusic1, b(), c);
    this.audio.preload(this.level.jumpMusic2, b(), c);
    e.forEach(function(e) {
        var g = a.images[e],
            f = new Image;
        h.images[e] = f;
        f.onload = b();
        f.onerror = c;
        f.src = d + g
    });
    this.renderer.drawLoadingScreen(0,
        g)
};
GameEngine.prototype.start = function() {
	if(!tas_textarea_persist){
		document.getElementById("keyoutputid").value = "";
		tas_textarea_persist=false;
	}
    this.charBitmap = Bitmap.fromImage(this.images.charHitmap);
    this.dead = !1;
    this.audio.play(this.level.backgroundMusic, !0, !0);
    this.restart();
    this.running = !0;
    this.tickFunctionStopped && this.doTick(this)
};
GameEngine.prototype.restart = function() {
	document.getElementById("keyoutputid").value = "";
    this.viewportX = this.level.startViewport.x;
    this.viewportY = this.level.startViewport.y;
    this.posX = this.level.startPosition.x;
    this.posY = this.level.startPosition.y;
    this.fallingState = FALLING;
    this.direction = RIGHT;
    this.canJump = this.isMoving = this.dead = !1;
    this.vspeed = 0;
    this.audio.stop(this.level.deathMusic);
    this.tickCount = 0;
    this.gameData = {};
    this.drawHooks = [];
    this.loadObjects();
    var a = this.storage.getItem(STORAGE_STATE);
    a && this.level.loadState(this, a);
    this.level.init(this)
};
GameEngine.prototype.saveState = function(a) {
    this.storage.setItem(STORAGE_STATE, a)
};
GameEngine.prototype.loadObjects = function() {
    var a = this,
        b = Object.deepcopy(this.level.objects);
    this.objects = [];
    this.objectMap = {};
    this.triggeringObjects = [];
    this.blockingObjects = [];
    this.drawableObjects = [];
    b = b.concatMap(function(a) {
        return cartesianProductOnObjects(a.position, ["x", "y"]).map(function(b) {
            var c = Object.deepcopy(a);
            c.x = b.x;
            c.y = b.y;
            return c
        })
    });
    var c = {};
    b.forEach(function(b) {
        b = a.addObject(b, c);
        b.init && b.init(a)
    });
    b = this.drawableObjects.partition(function(a) {
        return a.dynamic
    });
    this.drawableObjects =
        b[0];
    this.renderer.loadBackground(b[1]);
    this.renderer.loadForeground([])
};
GameEngine.prototype.addObject = function(a, b) {
    var c = a.dynamic || !!a.id,
        d = a.shape,
        e = a.trigger,
        g = void 0,
        f = void 0,
        h = void 0,
        l = void 0,
        k = "x y dynamic trigger image blocking killing id tickFunction zIndex position shape retrigger init".split(" ");
    b = b || {};
    Object.keys(a).deleteList(k).length && (console.log(Object.keys(a).deleteList(k)), dbg_assert(!1, "Unkown properties"));
    a.image && (g = this.images[a.image], dbg_assert(g, "invalid image id"), f = g.width, h = g.height);
    dbg_assert(!a.blocking || !e, "an object cannot block and have a trigger at the same time");
    a.killing && (dbg_assert(!e, "an object cannot kill and have a trigger at the same time"), dbg_assert(!a.blocking, "an object cannot kill and block at the same time"), e = this.die.bind(this));
    void 0 === d && g && (e || a.blocking || c) && (b[a.image] ? d = b[a.image] : b[a.image] = d = new AutoShape(g));
    d && (f = d.width, h = d.height, l = d.getBitmap());
    b = {
        x: a.x,
        y: a.y,
        width: f,
        height: h,
        dynamic: c,
        visible: !0,
        image: g,
        bitmap: l,
        trigger: e,
        zIndex: a.zIndex || 0,
        retrigger: !!a.retrigger,
        tickFunction: a.tickFunction,
        init: a.init
    };
    e && (dbg_assert(e instanceof Function, "trigger has to be a function"), dbg_assert(d, "objects that kill or have a trigger require a shape"), this.triggeringObjects.push(b));
    a.image && this.drawableObjects.push(b);
    a.blocking && (dbg_assert(d, "objects that block require a shape"), this.blockingObjects.push(b));
    this.objects.push(b);
    a.id && (dbg_assert(!this.objectMap[a.id], "id used twice"), this.objectMap[a.id] = b);
    return b
};
GameEngine.prototype.removeObject = function(a) {
    this.objects = this.objects.delete(a);
    this.blockingObjects = this.blockingObjects.delete(a);
    this.drawableObjects = this.drawableObjects.delete(a);
    this.triggeringObjects = this.triggeringObjects.delete(a);
    a.id && delete this.objectMap[a.id]
};
GameEngine.prototype.removeObjectById = function(a) {
    (a = this.objectMap[a]) && this.removeObject(a)
};
GameEngine.prototype.toggleMute = function() {
    this.audio.toggleMute();
    this.audio.muted ? this.storage.setItem(STORAGE_NO_AUDIO, 1) : this.storage.removeItem(STORAGE_NO_AUDIO)
};
GameEngine.prototype.die = function() {
    this.dead || (this.audio.play(this.level.deathMusic, !1, !0, .3), this.dead = !0);
	console.log("end");
	//document.getElementById("keyoutputid").value = "";
};
GameEngine.prototype.crush = function() {
    console.log("death by crushing");
    this.die()
};
GameEngine.prototype.doTick = function doTick(a) {
    a.tickFunctionStopped = !1;
    if (a.running) {
        var c = a.level,
            d = Date.now();
        a.totalDelta += d - a.lastTick;
        a.lastTick = d;
        500 <= a.totalDelta && (a.totalDelta = 0);
        for (; a.totalDelta >= c.physics.timePerTick;) a.tick(a), a.totalDelta -= c.physics.timePerTick;
        a.renderer.redraw();
        a.drawHooks.forEach(function(c) {
            c.call(a.level, a)
        });
        requestAnimationFrame(function() {
            doTick(a)
        })
    } else a.tickFunctionStopped = !0
};
GameEngine.prototype.tick = function(a) {
	var tas_info_text = "X: " + this.posX + ", Y: " + this.posY + ", canJump(2nd): " + this.canJump + ", tick: " + this.tickCount + ", replay_line: " + replay_line + ", last non-zero replay_line: " + lnzrl + ", loadLevel tick: " + tas_loadLevel_tick;
	GLOBAL_TICK_RO = this.tickCount;
	if(replay){
		NEW_KEYS_DOWN = REPLACE_FROM_CONSOLE(a.keyboard.keyWasPressed);
	}else{
		NEW_KEYS_DOWN=a.keyboard.keyWasPressed;
		replay_line=0;
	}
	if(stop_replay){
		STOP_ON_NEXT_TICK=true;
		FORCE_STOP_ENGINE_TICK_FUNCTION=true;
		replay=false;
		stop_replay=false;
	}
	if(FORCE_STOP_ENGINE_TICK_FUNCTION){
		document.getElementById("tas_info").innerHTML = tas_info_text;
		return;
	}
    var b = a.level.physics,
        c = a.keyboard.keyWasPressed;
    a.level.tickFunction(a);
    a.objects.forEach(function(b) {
        b.tickFunction && b.tickFunction.call(b, a);
        if (b.bitmap && b.trigger) {
            var c = a.characterCollision(b.bitmap, b.x, b.y);
            !c || !b.retrigger && b.triggered || b.trigger.call(b, a);
            b.triggered = c
        }
    });
    a.tickCount++;
    a.dead || (!c[KEY_LEFT] !== !c[KEY_RIGHT] ? (a.isMoving = !0, c[KEY_LEFT] ? (a.moveCharacterRight(-b.moveSpeed), a.direction = LEFT) : c[KEY_RIGHT] && (a.moveCharacterRight(b.moveSpeed),
        a.direction = RIGHT)) : a.isMoving = !1, a.fallingState === NOT_FALLING ? (c[KEY_JUMP] && (a.audio.play(a.level.jumpMusic1, !1, !1, .6), a.fallingState = IN_JUMP, a.canJump = !0, a.vspeed = b.jumpInitialSpeed, a.jumpTicks = b.jumpTicks), a.moveCharacterDown(1) || (a.fallingState = FALLING, a.canJump = !0)) : (a.fallingState === IN_JUMP ? (a.vspeed += b.jumpGravity, a.jumpTicks--, c[KEY_JUMP] && 0 !== a.jumpTicks || (a.fallingState = FALLING)) : (a.canJump && c[KEY_JUMP] && (a.audio.play(a.level.jumpMusic2, !1, !1, .6), a.fallingState = IN_JUMP, a.canJump = !1, a.vspeed =
        b.jumpInitialSpeed / 1.5, a.jumpTicks = b.jumpTicks), a.vspeed = a.vspeed < b.fallSpeedCap ? a.vspeed + b.fallGravity : b.fallSpeedCap), a.moveCharacterDown(Math.roundInfinity(a.vspeed)) && (0 < a.vspeed ? (a.fallingState = NOT_FALLING, a.vspeed = 0, c[KEY_JUMP] = !1) : a.vspeed = 0)))
	if(STOP_ON_NEXT_TICK){
		FORCE_STOP_ENGINE_TICK_FUNCTION = true;
	}
	document.getElementById("tas_info").innerHTML = tas_info_text;
};
GameEngine.prototype.addDrawHook = function(a) {
    this.drawHooks.push(a)
};
GameEngine.prototype.moveCharacterRight = function(a) {
    if (!this.charBitmap.compareMany(this.blockingObjects, this.posX + a, this.posY)) return this.posX += a, !1;
    for (var b = Math.sign(a); a;)
        if (this.posX += b, a -= b, this.charBitmap.compareMany(this.blockingObjects, this.posX, this.posY)) return this.posX -= b, !0;
    return !1
};
GameEngine.prototype.moveCharacterDown = function(a) {
    if (!this.charBitmap.compareMany(this.blockingObjects, this.posX, this.posY + a)) return this.posY += a, !1;
    for (var b = Math.sign(a); a;)
        if (this.posY += b, a -= b, this.charBitmap.compareMany(this.blockingObjects, this.posX, this.posY)) return this.posY -= b, !0;
    return !1
};
GameEngine.prototype.characterCollision = function(a, b, c) {
    return b > this.posX + this.level.characterWidth || c > this.posY + this.level.characterHeight || b + a.width < this.posX || c + a.height < this.posY ? !1 : this.charBitmap.compare(a, Math.round(b - this.posX), Math.round(c - this.posY))
};
GameEngine.prototype.moveObjectRight = function(a, b) {
    var c = Math.sign(b),
        d = !1;
    for (this.characterCollision(a.bitmap, a.x, a.y - 1) && (d = !0); b;) b -= c, a.x += c, d ? this.moveCharacterRight(c) : this.characterCollision(a.bitmap, a.x, a.y) && this.moveCharacterRight(c) && (console.log("crushed"), this.die())
};
GameEngine.prototype.moveObjectDown = function(a, b) {
    if (0 <= b) {
        var c = !1;
        for (this.characterCollision(a.bitmap, a.x, a.y - 1) && (c = !0); b;) a.y++, b--, c ? this.moveCharacterDown(1) : this.characterCollision(a.bitmap, a.x, a.y) && this.moveCharacterDown(1) && (console.log("crushed"), this.die())
    } else
        for (; b;) b++, a.y--, this.characterCollision(a.bitmap, a.x, a.y) && this.moveCharacterDown(-1) && (console.log("crushed"), this.die())
};

function AudioManager(a) {
    this.muted = !a;
    this.works = !0;
    window.Audio ? (new Audio).canPlayType("audio/ogg; codecs=vorbis") || (this.works = !1) : this.works = !1;
    this.playing = [];
    this.playQueue = []
}
AudioManager.prototype.play = function(a, b, c, d, e) {
    if (this.works)
        if (this.muted) this.playQueue.push([new Date, Array.toArray(arguments)]);
        else {
            var g = this.playing.filter(Function.byIndex("file", a)).find(function(a) {
                return (a.audio.ended || a.audio.paused) != !!c
            });
            if (g) var f = g.audio;
            else f = new Audio(this.path + a), this.playing.push({
                audio: f,
                file: a
            });
            g = !1;
            void 0 !== e ? f.duration && f.duration < e && (g = !0) : e = 0;
            g || (void 0 !== d && (f.volume = d), 4 > f.readyState ? f.addEventListener("loadedmetadata", function() {
                    f.currentTime = e
                }) :
                f.currentTime = e, f.loop = b, f.play())
        }
};
AudioManager.prototype.preload = function(a, b, c) {
    if (this.works && !this.muted)
        if (this.playing.find(Function.byIndex("file", a))) b && setTimeout(b, 0);
        else {
            var d = new Audio(this.path + a);
            d.muted = this.muted;
            b && (d.addEventListener("canplaythrough", b), c && d.addEventListener("error", c));
            d.load();
            this.playing.push({
                audio: d,
                file: a
            });
            return d
        }
    else setTimeout(b, 0)
};
AudioManager.prototype.stop = function(a) {
    function b(a) {
        a.audio.pause()
    }
    this.works && this.playing.filter(Function.byIndex("file", a)).forEach(b)
};
AudioManager.prototype.toggleMute = function() {
    function a(a) {
        a.audio.muted = b
    }
    if (this.works) {
        var b = this.muted = !this.muted;
        this.playing.forEach(a)
    }
    if (!this.muted) {
        var c = this;
        this.playQueue.forEach(function(a) {
            a[1][4] = (Date.now() - a[0]) / 1E3;
            c.play.apply(c, a[1])
        });
        this.playQueue = []
    }
};

function Bitmap(a, b) {
    this.width = a;
    this.height = b;
    this.count = a * b;
    this.data = new Uint8Array(this.count)
}
Bitmap.fromImage = function(a) {
    var b = a.width,
        c = a.height,
        d = new Bitmap(b, c),
        e = document.createElement("canvas"),
        g = e.getContext("2d");
    e.width = b;
    e.height = c;
    g.clearRect(0, 0, b, c);
    g.drawImage(a, 0, 0);
    a = g.getImageData(0, 0, b, c).data;
    for (b = 0; b < d.count; b++) d.data[b] = 0 < a[4 * b + 3] | 0;
    return d
};
Bitmap.prototype.withOtherRect = function(a, b, c, d, e) {
    b = this.getIntersection(a, b, c, d);
    c = b.otherY * a + b.otherX;
    d = b.thisY * this.width + b.thisX;
    for (var g = 0; g < b.height; g++) {
        for (var f = 0; f < b.width; f++) e(b.otherX + f, b.otherY + g, this.data[d]), c++, d++;
        c += a - b.width;
        d += this.width - b.width
    }
};
Bitmap.prototype.stringify = function() {
    for (var a = "Bitmap  width=" + this.width + " height=" + this.height + "\n", b = 0; b < this.height; b++) {
        for (var c = 0; c < this.width; c++) a += String(this.data[b * this.width + c]);
        a += "\n"
    }
    return a
};
Bitmap.prototype.set = function(a, b, c) {
    0 <= a && 0 <= b && a < this.width && b < this.height && (this.data[b * this.width + a] = c)
};
Bitmap.prototype.copy = function() {
    return {
        __proto__: Bitmap.prototype,
        width: this.width,
        height: this.height,
        count: this.count,
        data: new Uint8Array(this.data)
    }
};
Bitmap.prototype.getIntersection = function(a, b, c, d) {
    c = c || 0;
    d = d || 0;
    var e = Math.max(0, c),
        g = Math.max(0, d);
    c = Math.max(0, -c);
    d = Math.max(0, -d);
    return {
        thisX: e,
        thisY: g,
        otherX: c,
        otherY: d,
        width: Math.max(0, Math.min(this.width - e, a - c)),
        height: Math.max(0, Math.min(this.height - g, b - d))
    }
};
Bitmap.prototype.slice = function(a, b, c, d) {
    c = this.getIntersection(a, b, c, d);
    b = new Bitmap(a, b);
    d = c.thisY * this.width + c.thisX;
    for (var e = c.otherY * a + c.otherX, g = 0; g < c.height; g++) {
        for (var f = 0; f < c.width; f++) b.data[e] = this.data[d], d++, e++;
        d += this.width - c.width;
        e += a - c.width
    }
    return b
};
Bitmap.prototype.isZero = function() {
    for (var a = 0; a < this.count; a++)
        if (this.data[a]) return !1;
    return !0
};
Bitmap.prototype.or = function(a, b, c) {
    b = this.getIntersection(a.width, a.height, b, c);
    c = b.otherY * a.width + b.otherX;
    for (var d = b.thisY * this.width + b.thisX, e = 0; e < b.height; e++) {
        for (var g = 0; g < b.width; g++) this.data[d] |= a.data[c], c++, d++;
        c += a.width - b.width;
        d += this.width - b.width
    }
};
Bitmap.prototype.compare = function(a, b, c) {
    b = this.getIntersection(a.width, a.height, b, c);
    c = b.otherY * a.width + b.otherX;
    for (var d = b.thisY * this.width + b.thisX, e = 0; e < b.height; e++) {
        for (var g = 0; g < b.width; g++) {
            if (this.data[d] && a.data[c]) return !0;
            c++;
            d++
        }
        c += a.width - b.width;
        d += this.width - b.width
    }
    return !1
};
Bitmap.prototype.compareMany = function(a, b, c) {
    var d = this;
    return a.some(function(a) {
        return a.x > b + d.width || a.y > c + d.height || a.x + a.bitmap.width < b || a.y + a.bitmap.height < c ? !1 : d.compare(a.bitmap, a.x - b, a.y - c)
    })
};

function Line(a, b, c, d) {
    this.p1 = {
        x: a,
        y: b
    };
    this.p2 = {
        x: c,
        y: d
    };
    this.width = Math.abs(this.p1.x - this.p2.x) + 1;
    this.height = Math.abs(this.p1.y - this.p2.y) + 1;
    this.bitmap = null
}
Line.prototype.getBitmap = function() {
    if (this.bitmap) return this.bitmap;
    var a = (this.height - 1) / (this.width - 1);
    this.bitmap = new Bitmap(this.width, this.height);
    if (1 < a)
        for (var b = 0; b < this.height; b++) this.bitmap.set(Math.round(b / a), b, 1);
    else
        for (b = 0; b < this.width; b++) this.bitmap.set(b, Math.round(b * a), 1);
    return this.bitmap
};

function Rectangle(a, b) {
    this.width = a;
    this.height = b;
    this.bitmap = null
}
Rectangle.prototype.getBitmap = function() {
    if (this.bitmap) return this.bitmap;
    this.bitmap = new Bitmap(this.width, this.height);
    for (var a = 0; a < this.bitmap.count; a++) this.bitmap.data[a] = 1;
    return this.bitmap
};

function AutoShape(a) {
    this.width = a.width;
    this.height = a.height;
    this.image = a;
    this.bitmap = null
}
AutoShape.prototype.getBitmap = function() {
    this.bitmap || (this.bitmap = Bitmap.fromImage(this.image));
    return this.bitmap
};
var KEY_ADVANCE = 70, 
	KEY_UP = 38,
    KEY_DOWN = 40,
    KEY_LEFT = 37,
    KEY_RIGHT = 39,
    KEY_JUMP = 32,
    KEY_RESTART = 82,
    KEY_MUTE = 77,
    KEY_SHOOT = 84,
    KEY_SUICIDE = 81,
    KBD_STORAGE_KEY = "keyboard_settings";

function KeyboardManager(a) {
    this.keysPressed = {};
    this.keyWasPressed = {};
    this.game = a;
    (a = a.storage.getItem(KBD_STORAGE_KEY)) ? this.gameKeys = a: this.resetKeys();
    window.addEventListener("keydown", this.onkeydown.bind(this), !1);
    window.addEventListener("keyup", this.onkeyup.bind(this), !1);
    window.addEventListener("blur", this.onblur.bind(this), !1);
    var b = this,
        c = 0;
    document.getElementById("reset_keys").addEventListener("click", function() {
        this.textContent = "Done.;Keys resetted.;You keep failing at this, huh?;undefined;Just kidding.;Bored?;Okay ...;There once was a girl from Kentucky ...".split(";")[c++];
        8 === c && (location.href = "https://www.youtube.com/watch?v=oHg5SJYRHA0");
        b.resetKeys();
        b.saveSettings()
    }, !1);
    [
		["advance", KEY_ADVANCE],
        ["left", KEY_LEFT],
        ["right", KEY_RIGHT],
        ["shoot", KEY_SHOOT],
        ["jump", KEY_JUMP],
        ["mute", KEY_MUTE],
        ["restart", KEY_RESTART]
    ].forEach(function(a) {
        var c = a[1];
        a = document.getElementById("change_" + a[0]);
        var d = document.getElementById("keys"),
            f = document.getElementById("press_key_msg");
        a.addEventListener("click", function() {
            d.style.display = "none";
            f.style.display = "block";
            window.addEventListener("keydown", function k(a) {
                27 !==
                    a.which && (Object.deleteByValue(b.gameKeys, c), b.gameKeys[a.which] = c, b.saveSettings());
                window.removeEventListener("keydown", k, !1);
                d.style.display = "block";
                f.style.display = "none";
                a.preventDefault()
            }, !1)
        }, !1)
    })
	GLOBAL_KEYS_DOWN = this.keyWasPressed;
	//TEST = this.keysPressed;
	/*if(replay){
		this.keyWasPressed = REPLACE_FROM_CONSOLE(this.keyWasPressed);
	}else{
		replay_line=0;
	}*/
}
KeyboardManager.prototype.resetKeys = function() {
    this.gameKeys = {
		70: KEY_ADVANCE, 
        38: KEY_UP,
        40: KEY_DOWN,
        37: KEY_LEFT,
        39: KEY_RIGHT,
        32: KEY_JUMP,
        82: KEY_RESTART,
        77: KEY_MUTE,
        84: KEY_SHOOT,
        81: KEY_SUICIDE
    }
};
KeyboardManager.prototype.saveSettings = function() {
    this.game.storage.setItem(KBD_STORAGE_KEY, this.gameKeys)
};
KeyboardManager.prototype.isValid = function(a) {
    return !(a.ctrlKey || a.altKey || a.metaKey || a.target instanceof HTMLTextAreaElement || a.target instanceof HTMLInputElement || !this.gameKeys[a.which])
};
KeyboardManager.prototype.onkeydown = function(a) {
    this.keysPressed[a.which] ? a.preventDefault() : this.isValid(a) && (this.keysPressed[a.which] = !0, this.handleKey(!1, a.which), a.preventDefault())
};
KeyboardManager.prototype.onkeyup = function(a) {
    this.isValid(a) && (this.keysPressed[a.which] = !1, this.handleKey(!0, a.which), a.preventDefault())
};
KeyboardManager.prototype.onblur = function() {
    for (var a = Object.keys(this.keysPressed), b = 0; b < a.length; b++) {
        var c = a[b];
        this.keysPressed[c] && this.handleKey(!0, Number(c))
    }
    this.keysPressed = {}
};
KeyboardManager.prototype.handleKey = function(a, b) {
    b = this.gameKeys[b];
    b === KEY_MUTE ? a || this.game.toggleMute() : b === KEY_RESTART && (a || this.game.restart());
    b === KEY_SUICIDE ? a || this.game.die() : this.keyWasPressed[b] = !a;
	b === KEY_ADVANCE ? a || advance_ft() : this.keyWasPressed[b] = !a
};
window.requestAnimationFrame || (window.requestAnimationFrame = window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame);

function btn(num){
	if(num){
		return 1;
	}else{
		return 0;
	}
}

function advance_ft(){
	console.log("advance_ft");
	FORCE_STOP_ENGINE_TICK_FUNCTION = false;
	STOP_ON_NEXT_TICK = true;
	//console.log(GLOBAL_KEYS_DOWN);
	document.getElementById("keyoutputid").value+='\n';
	document.getElementById("keyoutputid").value+=btn(GLOBAL_KEYS_DOWN[KEY_LEFT]);
	document.getElementById("keyoutputid").value+=btn(GLOBAL_KEYS_DOWN[KEY_RIGHT]);
	document.getElementById("keyoutputid").value+=btn(GLOBAL_KEYS_DOWN[KEY_JUMP]);
	document.getElementById("keyoutputid").value+=btn(GLOBAL_KEYS_DOWN[KEY_SHOOT]);
}

function GameRenderer(a) {
    var b = document.getElementById("canvas");
    this.context = b.getContext("2d");
    b.width = a.width;
    b.height = a.height;
    if (1 < window.devicePixelRatio) {
        var c = a.width / window.devicePixelRatio * 2,
            d = a.height / window.devicePixelRatio * 2;
        c < window.innerWidth && d < window.innerHeight && (b.style.width = c + "px", b.style.height = d + "px", b.style.imageRendering = "crisp-edges", b.style.imageRendering = "pixelated")
    }
    this.canvas = b;
    this.backgroundCanvas = null;
    this.animationTick = 0;
    this.animations = {};
    this.game = a
	if(DRAW_TAS_INFO){
		GameRenderer.prototype.drawTASInfo(this.context);
	}
}
GameRenderer.prototype.loadBackground = function(a) {
    this.backgroundCanvas = this.imagesToCanvas(a, this.game.level.width, this.game.level.height, this.game.level.backgroundColor)
};
GameRenderer.prototype.loadForeground = function(a) {
    this.foregroundCanvas = this.imagesToCanvas(a, this.game.level.width, this.game.level.height)
};
GameRenderer.prototype.imagesToCanvas = function(a, b, c, d) {
    var e = document.createElement("canvas"),
        g = e.getContext("2d");
    e.width = b;
    e.height = c;
    d && (g.fillStyle = d, g.fillRect(0, 0, b, c));
    a.forEach(function(a) {
        g.drawImage(a.image, a.x, a.y, a.width, a.height)
    });
    return e
};
GameRenderer.prototype.drawAnimation = function(a, b, c) {
    a = this.game.level.animations[a];
    this.context.drawImage(this.game.images[a.images[(this.animationTick / a.time | 0) % a.images.length]], b, c)
};
GameRenderer.prototype.drawImageOrAnimation = function(a, b, c) {
    this.game.level.animations[a] ? this.drawAnimation(a, b, c) : this.context.drawImage(this.game.images[a], b, c)
};
GameRenderer.prototype.redraw = function() {
    var a = this.context,
        b = this.game,
        c = b.images;
    this.animationTick++;
    a.drawImage(this.backgroundCanvas, b.viewportX, b.viewportY, b.width, b.height, 0, 0, b.width, b.height);
    if (!b.dead) {
        var d = "char";
        b.fallingState === NOT_FALLING ? b.isMoving && (d += "Moving") : d = 0 < b.vspeed ? d + "Falling" : d + "Jumping";
        d = b.direction == LEFT ? d + "Left" : d + "Right";
        this.drawImageOrAnimation(d, b.posX - b.viewportX, b.posY - b.viewportY)
    }
    b.drawableObjects.forEach(function(c) {
        c.visible && c.x + c.width >= b.viewportX && c.x <
            b.viewportX + b.width && c.y + c.height >= b.viewportY && c.y < b.viewportY + b.height && a.drawImage(c.image, Math.round(c.x - b.viewportX), Math.round(c.y - b.viewportY), c.width, c.height)
    });
    b.dead && a.drawImage(c.gameOver, 0, 150)
	if(DRAW_TAS_INFO){
		GameRenderer.prototype.drawTASInfo(this.context);
	}
};
GameRenderer.prototype.drawLoadingScreen = function(a, b) {
    this.context.fillStyle = "#000";
    this.context.fillRect(0, 0, this.game.width, this.game.height);
    this.context.fillStyle = "#fff";
    this.context.font = "20px monospace";
    this.context.textAlign = "center";
    this.context.fillText("Loading resources. Please wait ...", this.game.width >> 1, 100);
    this.context.fillText(a + " out of " + b, this.game.width >> 1, 140)
};
GameRenderer.prototype.drawTASInfo = function(cont){
	cont.fillStyle = "#0aff00";
	cont.font = "20px monospace";
	cont.textAlign = "right";
	cont.fillText("X: " + "nye", 0, 0);
};
Math.sign = function(a) {
    return (0 < a) - (0 > a)
};
Math.roundInfinity = function(a) {
    return 0 < a ? Math.ceil(a) : Math.floor(a)
};
Math.floatToRandom = function(a) {
    var b = Math.floor(a);
    return b + (Math.random() > a - b)
};
Math.triangle = function(a) {
    return function(b) {
        b /= a;
        return -1 + 4 * Math.abs(b + .25 - Math.floor(b + .75))
    }
};
Math.rectangle = function(a) {
    var b = Math.triangle(a);
    return function(a) {
        return Math.sign(b(a))
    }
};
Math.compare = function(a, b) {
    return Math.sign(a - b)
};
Array.prototype.findIndex = function(a) {
    var b;
    this.some(function(c, d) {
        if (a(c)) return b = d, !0
    });
    return b
};
Array.prototype.find = function(a) {
    a = this.findIndex(a);
    if (void 0 !== a) return this[a]
};
Array.prototype.delete = function(a) {
    a = this.indexOf(a);
    return -1 !== a ? this.slice(0, a).concat(this.slice(a + 1)) : this
};
Array.prototype.concatMap = function(a) {
    var b = [];
    this.forEach(function(c) {
        b = b.concat(a(c))
    });
    return b
};
Array.prototype.deleteList = function(a) {
    return this.filter(function(b) {
        return -1 === a.indexOf(b)
    })
};
Array.replicate = function(a, b) {
    for (var c = [], d = 0; d < a; d++) c[d] = b;
    return c
};
Array.prototype.partition = function(a) {
    return this.reduce(function(b, c) {
        a(c) ? b[0].push(c) : b[1].push(c);
        return b
    }, [
        [],
        []
    ])
};
Array.toArray = function(a) {
    return [].slice.call(a)
};
Function.byIndex = function(a, b) {
    return function(c) {
        return c[a] === b
    }
};
Object.deepcopy = function clone(a) {
    if ("object" === typeof a) {
        if (a instanceof Array) return a.map(clone);
        if (a.__proto__)
            for (var c = {
                    __proto__: a.__proto__
                }, d = Object.keys(a), e = 0; e < d.length; e++) c[d[e]] = a[d[e]];
        else
            for (d in c = {}, a) c[d] = clone(a[d]);
        return c
    }
    return a
};
Object.isArray = function(a) {
    return a instanceof Array
};
Function.not = function(a) {
    return function(b) {
        return !a(b)
    }
};

function range(a, b, c) {
    var d = [];
    c = c || 1;
    dbg_assert(0 < c);
    void 0 === b && (b = a, a = 0);
    for (; a < b; a += c) d.push(a);
    return d
}
Function.hook = function(a, b, c) {
    var d = a[b];
    a[b] = function() {
        d.apply(this, arguments);
        c.apply(this, arguments)
    }
};
Object.extend = function(a, b) {
    for (var c = Object.keys(b), d, e = 0; e < c.length; e++) d = c[e], a[d] = b[d];
    return a
};
Object.deleteByValue = function(a, b) {
    for (var c = Object.keys(a), d = 0; d < c.length; d++) a[c[d]] === b && delete a[c[d]]
};
Object.merge = function(a, b) {
    return Object.extend(Object.extend({}, a), b)
};
Object.values = function(a) {
    for (var b = Object.keys(a), c = [], d = 0; d < b.length; d++) c.push(a[b[d]]);
    return c
};

function dbg_log(a) {
    document.getElementById("debug").textContent = a
}

function dbg_warn(a) {
    document.getElementById("warn").textContent += a + "\n"
}

function dbg_assert(a, b) {
    if (!a) throw console.trace(), "Assert failed: " + b;
}

function http_get(a, b, c) {
    var d = new XMLHttpRequest;
    d.onreadystatechange = function() {
        4 === d.readyState && (200 === d.status ? b(d.responseText, a) : c && c(d.responseText, d.status))
    };
    d.open("get", a, !0);
    d.send("");
    return {
        cancel: function() {
            d.abort()
        }
    }
}

function cartesianProductOnObjects(a, b) {
    Object.isArray(a) || (a = [a]);
    return b.reduce(function(a, b) {
        return a.concatMap(function(a) {
            var c = a[b];
            return Object.isArray(c) ? c.map(function(c) {
                var d = Object.deepcopy(a);
                d[b] = c;
                return d
            }) : [a]
        })
    }, a)
}; + function() {
    var a = "";
    window.addEventListener("keyup", function(b) {
        a = (a + b.which).substr(-14);
        83677278798377 == a && (localStorage.last_level = '"2up.js"', localStorage.removeItem("state"), location.reload())
    }, !1)
}();