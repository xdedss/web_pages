
import cv2
import numpy as np

#    ('Bop', 65000.0), 
#    ('Kerbin', 600000.0), 
#    ('Mun', 200000.0), 
#    ('Ike', 130000.0), 
#    ('Eve', 700000.0), 
#    ('Eeloo', 210000.0), 
#    ('Gilly', 13000.0), 
#    ('Laythe', 500000.0), 
#    ('Tylo', 600000.0), 
#    ('Jool', 6000000.0), 
#    ('Moho', 250000.0), 
#    ('Minmus', 60000.0), 
#    ('Duna', 320000.0), 
#    ('Kerbol', 261600000.0), 
#    ('Vall', 300000.0), 
#    ('Pol', 44000.0), 
#    ('Dres', 138000.0)
#

#[('Gilly', 13000.0), ('Pol', 44000.0), ('Minmus', 60000.0), ('Bop', 65000.0), ('Ike', 130000.0), ('Dres', 138000.0), ('Mun', 200000.0), ('Eeloo', 210000.0), ('Moho', 250000.0), ('Vall', 300000.0), ('Duna', 320000.0), ('Laythe', 500000.0), ('Kerbin', 600000.0), ('Tylo', 600000.0), ('Eve', 700000.0), ('Jool', 6000000.0), ('Kerbol', 261600000.0)]


bodies = [
    ('Bop', 0.54), 
    ('Kerbin', 0.93), 
    ('Mun', 1.0), 
    ('Ike', 0.95), 
    ('Eve', 1.0), 
    ('Eeloo', 1.0), 
    ('Gilly', 0.85), 
    ('Laythe', 1.0), 
    ('Tylo', 0.75), 
    ('Jool', 0.95), 
    ('Moho', 0.6), 
    ('Minmus', 0.97), 
    ('Duna', 0.9), 
    ('Kerbol', 1.0), 
    ('Vall', 0.9), 
    ('Pol', 0.76), 
    ('Dres', 1.0)
]

r_size = 200
for name, crop in bodies:
    print(name)
    src = cv2.imread(name + '.png', cv2.IMREAD_UNCHANGED)
    h, w, c = src.shape
    print(src.shape)
    if (c < 4):
        src = cv2.cvtColor(src, cv2.COLOR_BGR2BGRA)
    r = int(min(h, w) * crop / 2)
    res = cv2.resize(src[h//2-r:h//2+r, w//2-r:w//2+r], (r_size, r_size))
    
    for y in range(r_size):
        for x in range(r_size):
            if ((y-r_size//2)**2 + (x-r_size//2)**2 > (r_size//2)**2):
                res[y, x, :] = 0.
    cv2.imwrite(name + '_crop.png', res)

