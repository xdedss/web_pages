# jison -> js

import os


os.system('jison logic-parser.jison')

with open('logic-parser.js', 'a') as fo:
    with open('logic-parser-append.js', 'r') as fa:
        fo.write(fa.read())

