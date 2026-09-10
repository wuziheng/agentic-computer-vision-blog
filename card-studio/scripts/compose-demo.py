"""A small, original synthesized cue, not the animation's soundtrack.
Run from any directory using Python 3. Standard library only.
The entrance resolves at 8 seconds and leaves a quiet ambient tail.
"""
import math
from pathlib import Path
import struct
import wave

RATE = 22050
DURATION = 32
samples = [0.0] * (RATE * DURATION)

def note(time, midi, length=3.5, gain=.10, pad=False):
    hz = 440 * 2 ** ((midi - 69) / 12)
    for i in range(int(length * RATE)):
        at = int(time * RATE) + i
        if at >= len(samples):
            break
        t = i / RATE
        attack = min(1, t / (.7 if pad else .015))
        envelope = attack * (math.sin(math.pi * t / length) ** 1.4 if pad else math.exp(-t * 1.5))
        tone = (math.sin(2*math.pi*hz*t) + .22*math.sin(2*math.pi*hz*2.003*t) + .07*math.sin(2*math.pi*hz*3*t))
        samples[at] += tone * envelope * gain

# Open fifths under a pentatonic phrase; no sampled or third-party recordings.
for time, notes in [(0,[38,45,57]),(4,[34,41,53]),(8,[38,45,57]),(16,[34,41,53]),(24,[38,45,57])]:
    for midi in notes:
        note(time,midi,8,.027,True)
for time,midi in [(0,74),(.4,77),(.8,81),(1.2,84),(1.8,81),(2.6,77),(3.6,74),(4.8,72),(6.3,69),(8,74),(11,77),(14,81),(17,77),(20,72),(23,69),(26,74)]:
    note(time,midi)
    note(time+.26,midi,3,.025)
    note(time+.53,midi,3,.01)
for midi in [62,69,74]:
    note(8,midi,5,.07)
peak=max(abs(s) for s in samples)
data=bytearray()
for i,s in enumerate(samples):
    fade=min(1,(len(samples)-1-i)/(RATE*3))
    data.extend(struct.pack('<h',int(s/peak*.55*fade*32767)))
path=Path(__file__).resolve().parents[2]/'cards/yuanyao/assets/quiet-promise.wav'
with wave.open(str(path),'wb') as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(data)
print(path)
