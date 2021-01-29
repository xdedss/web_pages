

// xdedss 2021.1
// preload

// need jq

(function(){
    
    var preload = function(urls, onload){
        var status = {};
        urls.forEach(url=>{
            status[url] = null;
        });
        for (var url in status){
            (function(url){
                $.ajax({
                    type : 'GET',
                    url : url,
                    complete : function(xhr, s){
                        status[url] = s;
                        for (var urlCheck in status){
                            if (status[urlCheck] == null) return;
                        }
                        onload(status);
                    }
                });
            })(url);
        }
    }
    
    var preloadAndRetry = async function(urls, onload, maxRetry){
        maxRetry = Math.max(0, maxRetry || 0);
        var status;
        for (var i = 0; i <= maxRetry; i++){
            status = await new Promise(function(resolve, reject) {
                preload(urls, resolve);
            });
            var ok = true;
            for (var url in status){
                if (status[url] != 'success'){
                    ok = false;
                }
            }
            if (ok) break;
            console.log(status);
            console.log('retry...')
        }
        onload(status);
    }
    
    window.preload = preloadAndRetry;
    
})();


