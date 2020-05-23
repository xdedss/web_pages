import requests
import sys
import os.path


def minify(fpath):
    if '.js' in fpath and os.path.exists(fpath):
        try:
            url = 'https://javascript-minifier.com/raw'
            data = {'input': open(fpath, 'rb').read()}
            response = requests.post(url, data=data)
            response.encoding = 'utf-8'
            
            newpath = fpath.replace('.js', '.min.js')
            if newpath == fpath:
                newpath += '.min.js'
            with open(newpath, 'w', encoding='utf-8') as f:
                f.write(response.text)
            print('OK')
        except e:
            print(e)


if len(sys.argv) < 2:
    while True:
        print('file path?')
        fpath = input('>>>')
        minify(fpath)
else:
    fpath = sys.argv[1]
    minify(fpath)
