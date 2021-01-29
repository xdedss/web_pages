# coding=utf-8
from pyquery import PyQuery as pq
import requests, re, time

# 爬kspwiki

proxies = {
    'http': 'http://127.0.0.1:1080',
    'https': 'http://127.0.0.1:1080'
}

def get_bytes(url):
    try:
        response = requests.get(url, proxies=proxies)
        if response.status_code == 200:
            return response.content
    except requests.ConnectionError as e:
        print(e)
    print('--------- Failed to download ------')
    return None

root = 'https://wiki.kerbalspaceprogram.com/'
url = lambda path: root + path.strip('/')

doc_bytes = get_bytes(url('/wiki/Category:Celestials'))
doc = pq(doc_bytes.decode('utf-8'))
links =  list(set([a.attrib['href'] for a in doc('.navbox-columns-table a')]))

data = []
for link in links:
    doc_bytes = None
    i = 0
    while (doc_bytes == None and i < 10):
        time.sleep(2)
        print(link)
        doc_bytes = get_bytes(url(link))
        i += 1
    
    doc = pq(doc_bytes.decode('utf-8'))
    name = doc('#firstHeading').text()
    radius_text = doc('a[title="w:Radius"]').parent().next().children().text()
    radius = float(''.join(re.split('\\s+', radius_text)))
    data.append((name, radius))
    print(data)
    
    imgsrc = doc('img[alt="%s"]' % name).attr('src')
    img = None
    i = 0
    while (img == None and i < 10):
        time.sleep(2)
        print(imgsrc)
        img = get_bytes(url(imgsrc))
        i += 1
    with open('%s.png' % name, 'wb') as f:
        f.write(img)
    