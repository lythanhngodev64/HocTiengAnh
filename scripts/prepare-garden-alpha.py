"""Remove the generated neutral checkerboard; explicitly authorized local edit.
Usage: python scripts/prepare-garden-alpha.py source.png destination.png
Only border-connected neutral pixels are removed, preserving enclosed eyes/fur.
"""
import sys
from collections import deque
from PIL import Image, ImageFilter

im = Image.open(sys.argv[1]).convert('RGBA')
w, h = im.size
pixels = list(im.getdata())
mask = bytearray(w*h)
queue = deque()
def visit(i):
    if mask[i]: return
    r,g,b,a = pixels[i]
    if max(r,g,b)-min(r,g,b) <= 26 and 65 < (r+g+b)/3 < 236:
        mask[i] = 1
        queue.append(i)
for x in range(w):
    visit(x); visit((h-1)*w+x)
for y in range(h):
    visit(y*w); visit(y*w+w-1)
while queue:
    i=queue.popleft()
    x=i%w
    if x: visit(i-1)
    if x<w-1: visit(i+1)
    if i>=w: visit(i-w)
    if i<w*(h-1): visit(i+w)
alpha=Image.frombytes('L',(w,h),bytes(0 if v else 255 for v in mask))
# A tiny inward matte removes gray antialias fringes without thinning details.
alpha=alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.35))
im.putalpha(alpha)
im.save(sys.argv[2],optimize=True)
print(sys.argv[2], im.size, 'transparent pixels', sum(v==0 for v in alpha.getdata()))
