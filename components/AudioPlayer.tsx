import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  fileName?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, fileName = 'audio.mp3' }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-100 p-1.5 rounded-full pl-3 pr-2 w-fit">
      <audio ref={audioRef} src={src} className="hidden" />
      
      <button
        onClick={togglePlay}
        className="text-gray-700 hover:text-indigo-600 transition-colors focus:outline-none"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>

      <div className="w-px h-4 bg-gray-300 mx-2"></div>

      <a
        href={src}
        download={fileName}
        className="text-gray-500 hover:text-indigo-600 transition-colors focus:outline-none"
        aria-label="Download"
      >
        <Download size={16} />
      </a>
    </div>
  );
};
