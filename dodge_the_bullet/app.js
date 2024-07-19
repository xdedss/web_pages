
$(function () {

    const SPRITE_LEFT = -1;
    const SPRITE_CENTER = 0;
    const SPRITE_RIGHT = 1;

    const NOTE_STATE_INITIAL = 0;
    const NOTE_STATE_HIT = 1;
    const NOTE_STATE_MISS = 2;
    const NOTE_STATE_EMPTY = 3;

    let animationHandle = null;

    const testSong = {
        bpm: 125.387,
        totalBeats: 500,
        startOffset: 1.05, // seconds before the 0th beat
        url: './songs/ymca.mp3',
        notes: [
            {
                time: 0,
                direction: SPRITE_RIGHT,
            },
            {
                time: 2,
                direction: SPRITE_LEFT,
            },
            {
                time: 4,
                direction: SPRITE_RIGHT,
            },
            {
                time: 6,
                direction: SPRITE_LEFT,
            },
            {
                time: 8,
                direction: SPRITE_RIGHT,
            },
            {
                time: 10,
                direction: SPRITE_LEFT,
            },
            {
                time: 12,
                direction: SPRITE_RIGHT,
            },
            {
                time: 14,
                direction: SPRITE_LEFT,
            },
        ],
        events: [
            {
                time: 56,
                bpm: 127,
            }
        ],
    };

    const createBoolTracker = function (initialState) {
        return {
            state: !!initialState,
            lastState: !!initialState,
            update(state) {
                this.lastState = this.state;
                this.state = state;
            },
            becomeTrue() {
                return this.state && !this.lastState;
            },
            becomeFalse() {
                return this.lastState && !this.state;
            },
        };
    };
    const leftInputTracker = createBoolTracker(false);
    const rightInputTracker = createBoolTracker(false);
    const spaceInputTracker = createBoolTracker(false);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioSource = null;
    async function loadAudio(path) {
        let response = await fetch(path);
        let arrayBuffer = await response.arrayBuffer();
        let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    }

    function playAudio(audioBuffer) {
        let source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        return source;
    }

    const app = Vue.createApp({
        data() {
            return {
                // ===== settings =====
                windowSize: 100,
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

                // ===== state vars =====
                // state of the main char
                spriteState: SPRITE_CENTER,
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
                // keeps track of the next event
                nextEventIndex: 0,
                // playback speed
                bpm: 100,
                // playback progress
                playbackBeats: 0,
                totalBeats: 0,
                // play/pause
                isPlaying: false,

                // particles on hitline
                // { life: 1...0 relative life, direction: , content }
                particles: [],
            };
        },
        mounted() {
            let data = this;
            let dt = 0.0;
            let db = 0.0;
            let lastT = new Date().getTime() / 1000.0;
            let t = lastT;

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
            const trackPassLine = function (currentIndex, onPass) {
                // currentIndex: the next note that has not passed the line
                for (; currentIndex < data.notes.length; currentIndex++) {
                    if (data.notes[currentIndex].time > data.playbackBeats) {
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

            const tryHitNote = function (noteIndex) {
                let noteBeats = data.notes[noteIndex].time;
                let beatsBeforeHit = (noteBeats - data.playbackBeats);
                let secondsBeforeHit = beatsBeforeHit / (data.bpm / 60.0);
                if (secondsBeforeHit < data.hitToleranceBefore && secondsBeforeHit > -data.hitToleranceAfter) {
                    data.notes[noteIndex].state = NOTE_STATE_HIT;
                    spawnParticle(data.notes[noteIndex].direction, '' + Math.round(data.computeNoteScore(secondsBeforeHit)));
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
                leftInputTracker.update(window.kb.getKey('a'));
                rightInputTracker.update(window.kb.getKey('d'));
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

                if (data.isPlaying) {
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
                        data.endGame();
                    }

                }
                else {
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
                // particles
                for (let particle of data.particles) {
                    if (particle.life > 0) {
                        particle.life -= dt / data.particleLifeSeconds;
                    }
                }
                data.particles = data.particles.filter(p => p.life > 0);

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

                // stop/start game
                if (data.playbackBeats >= data.totalBeats) {
                    data.endGame();
                }

                animationHandle = window.requestAnimationFrame(gameTick);
            };
            animationHandle = window.requestAnimationFrame(gameTick);
        },
        methods: {
            async startPlay(song) {
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
                // clear scores
                this.scores = [];
                this.totalBeats = song.totalBeats;
                // play audio
                await audioContext.resume();
                audioSource = playAudio(await loadAudio(song.url));
                // reset state
                this.playbackBeats = - song.startOffset * song.bpm / 60.0;
                this.isPlaying = true;
                this.bpm = song.bpm;
                this.notesRoi = [0, 0];
                this.nearestLeftIndex = -1;
                this.nearestRightIndex = -1;
                this.nextNoteIndex = 0;
                this.nextEventIndex = 0;
                this.leftTimeout = 0;
                this.rightTimeout = 0;
            },
            endGame() {
                if (audioSource) {
                    audioSource.stop();
                }
                this.isPlaying = false;
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
                if (!this.isPlaying) {
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
                this.startPlay(testSong);
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
        },
    }).mount('#app');

    window.app = app;
});
