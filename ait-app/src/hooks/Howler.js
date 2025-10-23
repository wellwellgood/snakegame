import { Howl } from 'howler';
import { useState } from 'react';

function AudioPlayer() {
    const [sound, setSound] = useState(null);

    const playAudio = () => {
        const newSound = new Howl({
            src: ['/audio.mp3'],
            html5: false, // Web Audio API 사용
            onend: () => console.log('재생 완료')
        });

        newSound.play();
        setSound(newSound);
    };

    const stopAudio = () => {
        if (sound) {
            sound.stop();
        }
    };

    return (
        <div>
            <button onClick={playAudio}>재생</button>
            <button onClick={stopAudio}>정지</button>
        </div>
    );
}