
$(function () {

    const SPRITE_LEFT = -1;
    const SPRITE_CENTER = 0;
    const SPRITE_RIGHT = 1;

    let animationHandle = null;

    const testSong = {
        bpm: 100,
        notes: [
            {
                time: 1,
                direction: SPRITE_LEFT,
            },
            {
                time: 2,
                direction: SPRITE_LEFT,
            },
            {
                time: 3,
                direction: SPRITE_RIGHT,
            },
        ]
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

    const app = Vue.createApp({
        data() {
            return {
                spriteState: SPRITE_CENTER,
                windowSize: 100,
                leftTimeout: 0,
                rightTimeout: 0,
                notes: [], // must be ordered by time
                bpm: 100,
                playbackBeats: 0,
                isPlaying: false,
                particles: [],
            };
        },
        mounted() {
            let data = this.$data;
            let dt = 0.0;
            let db = 0.0;
            let lastT = new Date().getTime() / 1000.0;
            let t = lastT;
            const gameTick = function () {
                
                // handle input
                leftInputTracker.update(window.kb.getKey('a'));
                rightInputTracker.update(window.kb.getKey('d'));
                spaceInputTracker.update(window.kb.getKey('Space'));
                if (rightInputTracker.becomeTrue()) {
                    data.rightTimeout = 0.5;
                    data.leftTimeout = 0;
                }
                else if (leftInputTracker.becomeTrue()) {
                    data.leftTimeout = 0.5;
                    data.rightTimeout = 0;
                }

                // update timers
                t = new Date().getTime() / 1000.0;
                dt = t - lastT;
                db = dt * data.bpm / 60.0;
                lastT = t;
                
                if (data.isPlaying) {
                    data.playbackBeats += db;
                    console.log(data.playbackBeats);
                }
                
                if (data.leftTimeout > 0) {
                    data.leftTimeout -= db;
                }
                if (data.rightTimeout > 0) {
                    data.rightTimeout -= db;
                }

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
            startPlay(song) {
                this.$data.song = song;
                this.playbackBeats = 0;
            },
        },
        computed: {
            
        },
    }).mount('#app');

    window.app = app;
});
