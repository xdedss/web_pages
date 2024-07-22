
$(function () {

    const GAME_STATE_MENU = 0;
    const GAME_STATE_PLAYING = 1;
    const GAME_STATE_OVER = 2;
    const GAME_STATE_LOADING = 3;

    const SPRITE_LEFT = -1;
    const SPRITE_CENTER = 0;
    const SPRITE_RIGHT = 1;
    const SPRITE_DIRECTION_MAP = {
        'SPRITE_LEFT': SPRITE_LEFT,
        'SPRITE_CENTER': SPRITE_CENTER,
        'SPRITE_RIGHT': SPRITE_RIGHT,
    };
    const SPRITE_ANIM_IDLE = 0;
    const SPRITE_ANIM_W1 = 1;
    const SPRITE_ANIM_W2 = 2;
    const SPRITE_ANIM_SEQUENCE = [SPRITE_ANIM_IDLE, SPRITE_ANIM_W2, SPRITE_ANIM_W1, SPRITE_ANIM_W2, SPRITE_ANIM_W1, SPRITE_ANIM_W2, SPRITE_ANIM_IDLE, SPRITE_ANIM_IDLE];

    const NOTE_STATE_INITIAL = 0;
    const NOTE_STATE_HIT = 1;
    const NOTE_STATE_MISS = 2;
    const NOTE_STATE_EMPTY = 3;

    const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let animationHandle = null;
    let inBackground = false;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState != 'visible') {
            inBackground = true;
        }
        else {
            inBackground = false;
        }
    });

    const createBoolTracker = function (initialState) {
        return {
            state: !!initialState,
            lastState: !!initialState,
            override: null,
            update(state) {
                if (this.override !== null) {
                    state = this.override;
                    this.override = null;
                }
                this.lastState = this.state;
                this.state = state;
            },
            becomeTrue() {
                return this.state && !this.lastState;
            },
            becomeFalse() {
                return this.lastState && !this.state;
            },
            overrideNextUpdate(value) {
                this.override = value;
            },
        };
    };
    const leftInputTracker = createBoolTracker(false);
    const rightInputTracker = createBoolTracker(false);
    const spaceInputTracker = createBoolTracker(false);

    let preloadSongDefs = null;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const gunGainNode = audioContext.createGain();
    gunGainNode.gain.value = 0.5;
    gunGainNode.connect(audioContext.destination);
    let audioSource = null;
    let gunAudioBuffer = null;
    async function loadAudio(path) {
        let response = await fetch(path);
        let arrayBuffer = await response.arrayBuffer();
        let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    }
    function prepareSource(audioBuffer, dest) {
        let source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest == null ? audioContext.destination : dest);
        return source;
    }
    function playAudio(audioBuffer, dest) {
        let source = prepareSource(audioBuffer, dest);
        source.start();
        return source;
    }

    async function fetchJson(url) {
        try {
            let response = await fetch(url);
            // Check if the response is OK (status code 200-299)
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Parse the response as JSON
            let data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching JSON:', error);
        }
    }

    const app = Vue.createApp({
        data() {
            return {
                // ===== settings =====
                windowSize: 100,
                isMobile: IS_MOBILE,
                enableGunAudio: true,
                // dodge animation duration in beats
                dodgeDuration: 0.5,
                // bullet animation duration in beats
                bulletDuration: 0.3,
                // hit tolerance in seconds
                hitToleranceBefore: 0.15,
                hitToleranceAfter: 0.10,
                // roi in beats
                noteRoiBeatsBefore: 2,
                noteRoiBeatsAfter: 2,
                // layout
                noteSize: 0.1, // proportion to the full height
                noteSpeed: 0.3, // unit: height proportion per beat
                hitLinePosition: 0.5,
                // particles
                particleLifeSeconds: 1.5,
                particleHorizontalTravel: 0.3, // relative to height
                // audio
                audioDelay: 0.0, // sec
                gunAudioBias: 0.18, // sec

                // ===== state vars =====
                // state of the main char
                spriteState: SPRITE_CENTER,
                spriteAnim: SPRITE_ANIM_IDLE,
                // dodging
                leftTimeout: 0,
                rightTimeout: 0,
                // bullet marker
                leftBulletTimeout: 0,
                rightBulletTimeout: 0,
                // track the state of each note
                notes: [], // must be ordered by time {time: beats, direction: -1 /1}
                // track events
                events: [],
                // tracks the result of every hit from player
                scores: [],
                // range of note index that are in current playback
                notesRoi: [0, 0],
                // keeps track of nearest notes
                nearestLeftIndex: 0,
                nearestRightIndex: 0,
                // keeps track of the next note
                nextNoteIndex: 0,
                nextNotePreloadIndex: 0, // triggers before passing the line
                // keeps track of the next event
                nextEventIndex: 0,
                // playback speed
                bpm: 100,
                // playback progress
                playbackBeats: 0,
                totalBeats: 0,
                // state
                gameState: GAME_STATE_MENU,

                // particles on hitline
                // { life: 1...0 relative life, direction: , content }
                particles: [],
                // { x, y, vx, vy, ax, ay } all in relative units 0~1
                bloodDots: [],
            };
        },
        mounted() {
            let data = this;
            let dt = 0.0;
            let db = 0.0;
            let lastT = new Date().getTime() / 1000.0;
            let t = lastT;

            // controls the center animation
            let centerIdleBeats = 0;

            // start from currentIndex, find the next nearest index with given direction
            // return nearest note index
            const trackNearestNote = function (currentIndex, direction) {
                while (true) {
                    // initial value is -1
                    let distance = (currentIndex == -1 || data.notes[currentIndex].state !== NOTE_STATE_INITIAL) ?
                        1e5 : Math.abs(data.notes[currentIndex].time - data.playbackBeats);
                    let nextIndex = currentIndex + 1;
                    // find the next note with this direction
                    for (; nextIndex < data.notes.length; nextIndex++) {
                        if (data.notes[nextIndex].direction == direction) break;
                    }
                    // if no more notes with this direction, giveup
                    if (nextIndex >= data.notes.length || data.notes[nextIndex].direction != direction) {
                        break;
                    }
                    // update if newDistance is better
                    let newDistance = Math.abs(data.notes[nextIndex].time - data.playbackBeats);
                    if (newDistance < distance) {
                        // console.log(`${direction}: ${currentIndex} -> ${nextIndex}`);
                        currentIndex = nextIndex;
                    }
                    else break;
                }
                return currentIndex;
            };

            // move the Roi Start pointer to the first note in roi
            const trackRoiStart = function (currentIndex) {
                let roiStart = currentIndex;
                for (; roiStart < data.notes.length; roiStart++) {
                    let noteBeats = data.notes[roiStart].time;
                    let beatsBeforeHit = (noteBeats - data.playbackBeats);
                    let secondsBeforeHit = beatsBeforeHit / (data.bpm / 60.0);
                    if (beatsBeforeHit > -data.noteRoiBeatsAfter) {
                        break;
                    }
                    // console.log(secondsBeforeHit);
                    // console.log('start++');
                }
                return roiStart;
            };

            // move the Roi End pointer to one after the last note in roi
            const trackRoiEnd = function (currentIndex) {
                let roiEnd = currentIndex;
                for (; roiEnd < data.notes.length; roiEnd++) {
                    let noteBeats = data.notes[roiEnd].time;
                    let beatsBeforeHit = (noteBeats - data.playbackBeats);
                    let secondsBeforeHit = beatsBeforeHit / (data.bpm / 60.0);
                    if (beatsBeforeHit > data.noteRoiBeatsBefore) {
                        break;
                    }
                    // console.log(secondsBeforeHit);
                    // console.log('end++');
                }
                return roiEnd;
            };

            // track the next note that will pass the line
            // trigger callback if a note passes the line
            const trackPassLine = function (currentIndex, onPass, preloadBias) {
                if (preloadBias == null) preloadBias = 0;
                let preloadBiasBeats = preloadBias * (data.bpm / 60.0);
                // currentIndex: the next note that has not passed the line
                for (; currentIndex < data.notes.length; currentIndex++) {
                    if (data.notes[currentIndex].time - preloadBiasBeats > data.playbackBeats) {
                        // not yet
                        break;
                    }
                    // else, trigger callback
                    onPass(currentIndex);
                }
                return currentIndex;
            };

            // track events, triggers callback on event
            const trackEvent = function (currentIndex, onPass) {
                for (; currentIndex < data.events.length; currentIndex++) {
                    if (data.events[currentIndex].time > data.playbackBeats) {
                        // not yet
                        break;
                    }
                    // else, trigger callback
                    onPass(currentIndex);
                }
                return currentIndex;
            };

            const spawnParticle = function (direction, content) {
                data.particles.push({
                    life: 1,
                    direction: direction,
                    content: content,
                });
            };

            const spawnBlood = function (direction) {
                for (let i = 0; i < 4; i++) {
                    const baseVx = 0.1;
                    const baseX = 0.06;
                    const randVx = 0.4;
                    const randVyFrom = -0.3;
                    const randVyTo = 0.0;
                    let blood = {
                        x: direction == SPRITE_LEFT ? (0.5 + baseX) : (0.5 - baseX),
                        y: 0.3,
                        vx: direction == SPRITE_LEFT ? (baseVx + Math.random() * randVx) : -(baseVx + Math.random() * randVx),
                        vy: Math.random() * (randVyTo - randVyFrom) + randVyFrom,
                        ax: 0,
                        ay: 1,
                    };
                    data.bloodDots.push(blood);
                }
            };

            const tryHitNote = function (noteIndex) {
                let noteBeats = data.notes[noteIndex].time;
                let beatsBeforeHit = (noteBeats - data.playbackBeats);
                let secondsBeforeHit = beatsBeforeHit / (data.bpm / 60.0);
                if (secondsBeforeHit < data.hitToleranceBefore && secondsBeforeHit > -data.hitToleranceAfter) {
                    data.notes[noteIndex].state = NOTE_STATE_HIT;
                    let earlyMarker = secondsBeforeHit > 0 ? '-' : '+';
                    spawnParticle(data.notes[noteIndex].direction, '' + Math.round(data.computeNoteScore(secondsBeforeHit)) + earlyMarker);
                    data.scores.push({
                        time: data.playbackBeats,
                        secs: data.playbackBeats / (data.bpm / 60.0),
                        type: NOTE_STATE_HIT,
                        index: noteIndex,
                        bias: secondsBeforeHit,
                    });
                }
                else {
                    // otherwise it is an empty hit
                    spawnParticle(data.notes[noteIndex].direction, '?');
                    data.scores.push({
                        time: data.playbackBeats,
                        secs: data.playbackBeats / (data.bpm / 60.0),
                        type: NOTE_STATE_EMPTY,
                        index: null,
                        bias: null,
                    });
                }
            };

            const markMissNotes = function (startIndex, endIndex) {
                for (let noteIndex = startIndex; noteIndex < endIndex; noteIndex++) {
                    if (data.notes[noteIndex].state == NOTE_STATE_INITIAL) {
                        let noteBeats = data.notes[noteIndex].time;
                        let beatsBeforeHit = (noteBeats - data.playbackBeats);
                        let secondsBeforeHit = beatsBeforeHit / (data.bpm / 60.0);
                        if (secondsBeforeHit <= -data.hitToleranceAfter) {
                            data.notes[noteIndex].state = NOTE_STATE_MISS;
                            spawnParticle(data.notes[noteIndex].direction, 'hit');
                            spawnBlood(data.notes[noteIndex].direction);
                            data.scores.push({
                                time: data.playbackBeats,
                                secs: data.playbackBeats / (data.bpm / 60.0),
                                type: NOTE_STATE_MISS,
                                index: noteIndex,
                                bias: secondsBeforeHit,
                            });
                        }
                    }
                }
            };

            const gameTick = function () {

                // update timers
                t = new Date().getTime() / 1000.0;
                dt = t - lastT;
                db = dt * data.bpm / 60.0;
                lastT = t;

                // handle input
                leftInputTracker.update(window.kb.getKey('a') || window.kb.getKey('ArrowLeft'));
                rightInputTracker.update(window.kb.getKey('d') || window.kb.getKey('ArrowRight'));
                spaceInputTracker.update(window.kb.getKey('Space'));

                // sprite movement
                if (rightInputTracker.becomeTrue()) {
                    data.rightTimeout = data.dodgeDuration;
                    data.leftTimeout = 0;
                }
                else if (leftInputTracker.becomeTrue()) {
                    data.leftTimeout = data.dodgeDuration;
                    data.rightTimeout = 0;
                }

                if (data.gameState == GAME_STATE_PLAYING) {
                    data.playbackBeats += db;
                    // console.log(data.playbackBeats);

                    // track ROI
                    let [roiStart, roiEnd] = data.notesRoi;
                    data.notesRoi[0] = trackRoiStart(roiStart);
                    data.notesRoi[1] = trackRoiEnd(roiEnd);
                    // console.log(roiStart, roiEnd);

                    // track nearest notes
                    data.nearestLeftIndex = trackNearestNote(data.nearestLeftIndex, SPRITE_LEFT);
                    data.nearestRightIndex = trackNearestNote(data.nearestRightIndex, SPRITE_RIGHT);
                    // track notes passing the line
                    data.nextNoteIndex = trackPassLine(data.nextNoteIndex, noteIndexPassed => {
                        // control bullet animation (dodge left = right bullet)
                        if (data.notes[noteIndexPassed].direction == SPRITE_LEFT) {
                            data.rightBulletTimeout = data.bulletDuration;
                        }
                        else if (data.notes[noteIndexPassed].direction == SPRITE_RIGHT) {
                            data.leftBulletTimeout = data.bulletDuration;
                        }
                    });
                    data.nextNotePreloadIndex = trackPassLine(data.nextNotePreloadIndex, noteIndexPassed => {
                        // play audio
                        if (!inBackground && data.enableGunAudio) {
                            playAudio(gunAudioBuffer, gunGainNode);
                        }
                    }, data.gunAudioBias);
                    // track events
                    data.nextEventIndex = trackEvent(data.nextEventIndex, eventIndex => {
                        let event = data.events[eventIndex];
                        console.log(event);
                        if (event.bpm !== undefined) {
                            data.bpm = event.bpm;
                        }
                    });

                    // check for hit
                    if (leftInputTracker.becomeTrue()) {
                        tryHitNote(data.nearestLeftIndex);
                    }
                    if (rightInputTracker.becomeTrue()) {
                        tryHitNote(data.nearestRightIndex);
                    }

                    // check for miss
                    markMissNotes(data.notesRoi[0], data.notesRoi[1]);

                    // user exits game
                    if (spaceInputTracker.becomeTrue()) {
                        // clear scores
                        // data.scores = [];
                        data.endGame();
                        data.gameState = GAME_STATE_MENU;
                    }
                    // naturally stops
                    if (data.playbackBeats >= data.totalBeats) {
                        data.endGame();
                    }

                }
                else if (data.gameState == GAME_STATE_MENU || data.gameState == GAME_STATE_OVER) {
                    if (spaceInputTracker.becomeTrue()) {
                        data.playDemo();
                    }
                }

                // timers
                if (data.leftTimeout > 0) {
                    data.leftTimeout -= db;
                }
                if (data.rightTimeout > 0) {
                    data.rightTimeout -= db;
                }
                if (data.leftBulletTimeout > 0) {
                    data.leftBulletTimeout -= db;
                }
                if (data.rightBulletTimeout > 0) {
                    data.rightBulletTimeout -= db;
                }
                // idle anim
                if (data.leftTimeout <= 0 && data.rightTimeout <= 0) {
                    centerIdleBeats += db;
                }
                else {
                    centerIdleBeats = 0;
                }
                if (data.gameState == GAME_STATE_PLAYING) {
                    data.spriteAnim = SPRITE_ANIM_SEQUENCE[
                        Math.floor(centerIdleBeats * 2 - 0.1 + SPRITE_ANIM_SEQUENCE.length) % SPRITE_ANIM_SEQUENCE.length
                    ];
                }
                else {
                    data.spriteAnim = SPRITE_ANIM_IDLE;
                }
                // particles
                for (let particle of data.particles) {
                    if (particle.life > 0) {
                        particle.life -= dt / data.particleLifeSeconds;
                    }
                }
                data.particles = data.particles.filter(p => p.life > 0);
                // blood
                for (let blood of data.bloodDots) {
                    blood.vx += blood.ax * dt;
                    blood.vy += blood.ay * dt;
                    blood.x += blood.vx * dt;
                    blood.y += blood.vy * dt;
                }
                data.bloodDots = data.bloodDots.filter(b => b.y < 1.0);

                // update sprite
                if (data.leftTimeout > 0) {
                    data.spriteState = SPRITE_LEFT;
                }
                else if (data.rightTimeout > 0) {
                    data.spriteState = SPRITE_RIGHT;
                }
                else {
                    data.spriteState = SPRITE_CENTER;
                }


                animationHandle = window.requestAnimationFrame(gameTick);
            };
            animationHandle = window.requestAnimationFrame(gameTick);
        },
        methods: {
            async preloadAsyncContents(url) {
                this.gameState = GAME_STATE_LOADING;
                preloadSongDefs = await fetchJson(url);
                for (let note of preloadSongDefs.notes) {
                    if (SPRITE_DIRECTION_MAP[note.direction] !== undefined) {
                        note.direction = SPRITE_DIRECTION_MAP[note.direction];
                    }
                }
                await audioContext.resume();
                gunAudioBuffer = await loadAudio('./songs/gun.mp3');
                audioSource = prepareSource(await loadAudio(preloadSongDefs.url));
            },
            async startPlayUrl(url) {
                await this.preloadAsyncContents(url);
                console.log(preloadSongDefs);
                this.startPlay(preloadSongDefs);
            },
            startPlay(song) {
                // build notes
                let notesWithState = [];
                for (let note of song.notes) {
                    notesWithState.push({
                        time: note.time,
                        direction: note.direction,
                        state: NOTE_STATE_INITIAL,
                        // hit bias in seconds
                        bias: null,
                    });
                }
                this.notes = notesWithState;
                console.log(`got notes len = ${notesWithState.length}`);
                // events
                this.events = song.events;
                this.totalBeats = song.totalBeats;
                // play audio
                audioSource.start();
                // clear scores
                this.scores = [];
                // reset state
                this.playbackBeats = - (song.startOffset + this.audioDelay) * song.bpm / 60.0;
                this.gameState = GAME_STATE_PLAYING;
                this.bpm = song.bpm;
                this.notesRoi = [0, 0];
                this.nearestLeftIndex = -1;
                this.nearestRightIndex = -1;
                this.nextNoteIndex = 0;
                this.nextNotePreloadIndex = 0;
                this.nextEventIndex = 0;
                this.leftTimeout = 0;
                this.rightTimeout = 0;
            },
            endGame() {
                if (audioSource) {
                    audioSource.stop();
                }
                this.gameState = GAME_STATE_OVER;
            },
            getMainSpriteStyle() {
                let styleDict = {};
                let beatFrac = this.playbackBeats % 2.0;
                if (this.playbackBeats >= 0 && beatFrac < 1.0) {
                    styleDict.top = '1.4%';
                }
                // console.log(styleDict);
                return styleDict;
            },
            getIconStyle(noteIndex) {
                let note = this.notes[noteIndex];
                let styleDict = {};
                // size
                styleDict.width = (this.noteSize * 100) + '%';
                // left / right 均以躲避方向为准
                if (note.direction == SPRITE_LEFT) {
                    styleDict.right = '20%';
                }
                else if (note.direction == SPRITE_RIGHT) {
                    styleDict.left = '20%';
                }
                // vertical position
                let beatsBeforeHit = (note.time - this.playbackBeats);
                let heightBiasUpward = this.noteSpeed * beatsBeforeHit;
                styleDict.top = (100 * (this.hitLinePosition - heightBiasUpward - 0.5 * this.noteSize)) + '%';
                // debug highlight
                // if (noteIndex == this.nearestLeftIndex || noteIndex == this.nearestRightIndex) {
                //     styleDict.border = '1px solid #000';
                // }
                if (note.state == NOTE_STATE_HIT) {
                    styleDict.opacity = '0.3';
                    styleDict['background-color'] = 'rgba(0, 255, 0, 0.3)';
                }
                if (note.state == NOTE_STATE_MISS) {
                    styleDict['background-color'] = '#f00';
                }
                return styleDict;
            },
            getStaticIconStyle(direction) {
                let styleDict = {};
                // visibility
                if (this.gameState != GAME_STATE_PLAYING) {
                    styleDict.display = 'none';
                }
                // size
                styleDict.width = (this.noteSize * 100) + '%';
                // left / right 均以躲避方向为准
                if (direction == SPRITE_LEFT) {
                    styleDict.right = '20%';
                }
                else if (direction == SPRITE_RIGHT) {
                    styleDict.left = '20%';
                }
                // vertical position
                styleDict.top = (100 * (this.hitLinePosition - 0.5 * this.noteSize)) + '%';
                return styleDict;
            },
            getParticleStyle(particle) {
                // { life, direction, content }
                let styleDict = {};
                // size
                styleDict.width = (this.noteSize * 100) + '%';
                // left / right 均以躲避方向为准
                if (particle.direction == SPRITE_LEFT) {
                    styleDict['text-align'] = 'right';
                    styleDict.right = (20 - 100 * this.particleHorizontalTravel * (1 - particle.life)) + '%';
                }
                else if (particle.direction == SPRITE_RIGHT) {
                    styleDict['text-align'] = 'left';
                    styleDict.left = (20 - 100 * this.particleHorizontalTravel * (1 - particle.life)) + '%';
                }
                if (particle.content == '?' || particle.content == 'hit') {
                    styleDict.color = '#800';
                }
                styleDict.opacity = particle.life;
                styleDict.top = (100 * (this.hitLinePosition)) + '%';
                return styleDict;
            },
            getBloodStyle(blood) {
                // { x, y, vx, vy, ax, ay }
                let styleDict = {};
                // size
                styleDict.top = (blood.y * 100) + '%';
                styleDict.left = (blood.x * 100) + '%';
                return styleDict;
            },
            computeNoteScore(timeBeforeHit) {
                let res = 0;
                if (timeBeforeHit > 0) {
                    // hit early
                    res += 100 * (1 - timeBeforeHit / this.hitToleranceBefore);
                }
                else {
                    // hit late
                    res += 100 * (1 - Math.abs(timeBeforeHit) / this.hitToleranceAfter);
                }
                return Math.round(res);
            },
            playDemo() {
                this.startPlayUrl('./songs/ymca.json');
            },
            handleBtn(btnName) {
                if (btnName == 'a') {
                    leftInputTracker.overrideNextUpdate(true);
                }
                else if (btnName == 'd') {
                    rightInputTracker.overrideNextUpdate(true);
                }
                else if (btnName == 'space') {
                    spaceInputTracker.overrideNextUpdate(true);
                }
            },
        },
        computed: {
            noteIndexInRoi() {
                let res = [];
                // console.log('compute notesinroi');
                for (let i = this.notesRoi[0]; i < this.notesRoi[1]; i++) {
                    res.push(i);
                }
                return res;
            },
            showTip() {
                return this.gameState == GAME_STATE_MENU;
            },
            showStat() {
                return this.gameState == GAME_STATE_OVER;
            },
            showLoading() {
                return this.gameState == GAME_STATE_LOADING;
            },
            totalScore() {
                let res = 0;
                for (let hitStat of this.scores) {
                    // { time, type, index, bias }
                    switch (hitStat.type) {
                        case NOTE_STATE_HIT:
                            res += this.computeNoteScore(hitStat.bias);
                            break;
                        case NOTE_STATE_MISS:
                            break;
                        case NOTE_STATE_EMPTY:
                            res -= 30;
                            break;
                    }
                }
                return res;
            },
            scoreStats() {
                let hitCount = 0;
                let missCount = 0;
                let emptyCount = 0;
                for (let hitStat of this.scores) {
                    // { time, type, index, bias }
                    switch (hitStat.type) {
                        case NOTE_STATE_HIT:
                            hitCount++;
                            break;
                        case NOTE_STATE_MISS:
                            missCount++;
                            break;
                        case NOTE_STATE_EMPTY:
                            emptyCount++;
                            break;
                    }
                }
                return `躲过${hitCount}次射击 被击中${missCount}次 假动作${emptyCount}次`;
            },
            scoreComment() {
                if (this.scores.length == 0) {
                    return 'empty!';
                }
                let hitCount = 0;
                let missCount = 0;
                let emptyCount = 0;
                for (let hitStat of this.scores) {
                    // { time, type, index, bias }
                    switch (hitStat.type) {
                        case NOTE_STATE_HIT:
                            hitCount++;
                            break;
                        case NOTE_STATE_MISS:
                            missCount++;
                            break;
                        case NOTE_STATE_EMPTY:
                            emptyCount++;
                            break;
                    }
                }
                if (missCount == 0) {
                    if (emptyCount <= 10) return '毫发无伤';
                    else return '假动作';
                }
                if (missCount <= 10) {
                    return 'FIGHT!';
                }
                return '耐狙王';
            },
        },
    }).mount('#app');

    window.app = app;
});
