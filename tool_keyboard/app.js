
$(document).one('mousedown pointerdown touchstart contextmenu click change', Tone.start);


(function($){
    

$(function(){
    
    var vol = new Tone.Volume(-3).toDestination();
    var synth = new Tone.PolySynth(Tone.Synth).connect(vol);
    var pitchBias = 0
    
    function scrollRelative(e, t){
        var p = $(e);
        var c = p.children();
        c.css('left', (-t * (c.width() - p.width())) + 'px');
    }

    function changePitch(d){
        for (var i in keyTriggers){
            if (keyTriggers[i] != null){
                keyTriggers[i].clear();
            }
        }
        pitchBias += d;
        $('#pitchBias').html(pitchBias);
        updateMark();
    }
    
    function updateMark(){
        $('.key span').toArray().forEach(item=>item.innerHTML=toFullName(pitchBias+Number(item.parentElement.getAttribute('note'))))
    }
    
    $('#upload').change(function(e) {
        var file = $('#upload')[0].files[0];
        if (file == null) return;
        
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(e){
            synth = new Tone.Sampler({
            	urls: {
            		"C4": reader.result,
            	},
            }).toDestination();
        }
    });
    
    $('#position').on('input', e=>{
        scrollRelative($('#keyboard-scroll'), $('#position').val()/100.0);
    });
    
    $('#scale').on('input', e=>{
        $('#keyboard-scroll').css('font-size', $('#scale').val()+'px');
        scrollRelative($('#keyboard-scroll'), $('#position').val()/100.0);
    });
    
    $('#hotkeyselect').on('input', e=>{
        initKeyboard(keysetFromString($('#hotkeyselect').val()));
    });
    
    $('#pitchup').on('click', e=>changePitch(1));
    $('#pitchdown').on('click', e=>changePitch(-1));
    
    var pointerDown = false;
    $(document).on('pointerdown', e=>pointerDown = true).on('pointerup', e=>pointerDown = false);
    
    // name/index conversion
    var names = {
        0 : 'C',
        1 : 'C#',
        2 : 'D',
        3 : 'D#',
        4 : 'E',
        5 : 'F',
        6 : 'F#',
        7 : 'G',
        8 : 'G#',
        9 : 'A',
        10 : 'A#',
        11 : 'B',
    };
    var nums = {
        'Cb' : -1,
        'C' : 0,
        'C#' : 1,
        'Db' : 1,
        'D' : 2,
        'D#' : 3,
        'Eb' : 3,
        'E' : 4,
        'E#' : 5,
        'Fb' : 4,
        'F' : 5,
        'F#' : 6,
        'Gb' : 6,
        'G' : 7,
        'G#' : 8,
        'Ab' : 8,
        'A' : 9,
        'A#' : 10,
        'Bb' : 10,
        'B' : 11,
        'B#' : 12,
    }
    
    var keysetFromString = function(str){
        var keyset = {};
        Array.from(str).forEach((c, i)=>{
            keyset[c] = i;
        });
        return keyset;
    };
    
    var toName = function(num){
        return names[num];
    }
    
    var toNum = function(name){
        return nums[name];
    }
    
    var toFullNum = function(fullName){
        return parseInt(fullName.slice(-1)) * 12 + toNum(fullName.slice(0, -1));
    }
    
    var toFullName = function(fullNum){
        var mod = fullNum % 12;
        return toName(mod) + ((fullNum - mod) / 12);
    }
    
    var listeners = [];
    var initKeyboard = function(keyset){
        listeners.forEach(listener=>{
            kb.remove(listener);
        });
        for (var key in keyset){
            (function(k, kid){
                listeners.push(kb.onKeyDown(k, ()=>{
                    keyTriggers[kid].set('keyboard', true);
                }));
                listeners.push(kb.onKeyUp(k, ()=>{
                    keyTriggers[kid].set('keyboard', false);
                }));
            })(key, keyset[key] + 36)
        }
    }
    
    var keyTriggers = [];
    var blackDiv = $('#black-keys');
    var whiteDiv = $('#white-keys');
    for (var i = 9; i < 97; i++){
        switch (i % 12){
            case 1:
                blackDiv.append(`<div class="key b1" note="${i}"></div>`);
                break;
            case 3:
                blackDiv.append(`<div class="key b2" note="${i}"></div>`);
                break;
            case 6:
                blackDiv.append(`<div class="key b3" note="${i}"></div>`);
                break;
            case 8:
                blackDiv.append(`<div class="key b4" note="${i}"></div>`);
                break;
            case 10:
                blackDiv.append(`<div class="key b5" note="${i}"></div>`);
                break;
            case 0:
                whiteDiv.append(`<div class="key" note="${i}"><span>C${i / 12}</span></div>`);
                break;
            default:
                whiteDiv.append(`<div class="key" note="${i}"></div>`);
                break;
        }
        keyTriggers[i] = {
            triggers : {},
            last : false,
            note : i,
            set : function(id, stat){
                this.triggers[id] = stat;
                var current = this.get();
                if (this.last && !current){
                    this.up();
                }
                if (current && !this.last){
                    this.down();
                }
                this.last = current;
            },
            get : function(){
                var res = false;
                for (var id in this.triggers){
                    res |= this.triggers[id];
                }
                return res;
            },
            down : function(){
                synth.triggerAttack(toFullName(parseInt(this.note) + pitchBias));
                $('.key[note=' + this.note + ']').addClass('pressed');
            },
            up : function(){
                synth.triggerRelease(toFullName(parseInt(this.note) + pitchBias));
                $('.key[note=' + this.note + ']').removeClass('pressed');
            },
            clear : function(){
                for (var id in this.triggers){
                    this.set(id, false);
                }
            },
        };
    }
    
    $('.key').on('pointerdown', e=>{
        keyTriggers[parseInt(e.target.getAttribute('note'))].set('pointer', true);
    }).on('pointerup pointerleave', e=>{
        keyTriggers[parseInt(e.target.getAttribute('note'))].set('pointer', false);
    }).on('pointerenter', e=>{
        //console.log(pointerDown, e.target.getAttribute('note'));
        if (pointerDown){
            keyTriggers[parseInt(e.target.getAttribute('note'))].set('pointer', true);
        }
//    }).on('mousedown', e=>{
//        keyTriggers[parseInt(e.target.getAttribute('note'))].set('mouse', true);
//    }).on('mouseup mouseleave', e=>{
//        keyTriggers[parseInt(e.target.getAttribute('note'))].set('mouse', false);
//    }).on('mouseenter', e=>{
//        if (pointerDown){
//            keyTriggers[parseInt(e.target.getAttribute('note'))].set('mouse', true);
//        }
    }).on('dragstart selectstart contextmenu', e=>false);
    
    kb.onKeyDown('ArrowUp', ()=>changePitch(1));
    kb.onKeyDown('ArrowDown', ()=>changePitch(-1));
    
    //var keyset1 = keysetFromString("AWSEDFTGYHUJKOLP;'");
    var keyset2 = keysetFromString("ZSXDCVGBHNJM,L.;/Q2W3E4RT6Y7UI9O0P-[]");
    //var keyset3 = keysetFromString("z.x.cv.b.n.ma.s.df.g.h.jq.w.er.t.y.u1.2.34.5.6.78");
    
    //synth.triggerAttackRelease("C4", "8n");
    initKeyboard(keyset2);
    scrollRelative($('#keyboard-scroll'), $('#position').val()/100.0);
});



})(jQuery);

