import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";

function getEmbedUrl(url) {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?enablejsapi=1&rel=0`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?api=1`;
  // Hudl (direct embed)
  if (url.includes("hudl.com/embed")) return url;
  if (url.includes("hudl.com/video")) return url.replace("/video/", "/embed/video/");
  // Direct mp4 / generic
  return url;
}

function isIframe(url) {
  if (!url) return false;
  return url.includes("youtube") || url.includes("youtu.be") || url.includes("vimeo") || url.includes("hudl");
}

const VideoPlayer = forwardRef(function VideoPlayer({ url, onTimeUpdate }, ref) {
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const embedUrl = getEmbedUrl(url);
  const useIframe = isIframe(url);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => currentTime,
    seekTo: (secs) => {
      if (videoRef.current) videoRef.current.currentTime = secs;
    }
  }));

  const handleTimeUpdate = () => {
    const t = videoRef.current?.currentTime || 0;
    setCurrentTime(t);
    onTimeUpdate?.(t);
  };

  if (!url) return (
    <div className="w-full aspect-video bg-[#0d0d0d] border border-gray-800 rounded-xl flex items-center justify-center">
      <p className="text-gray-600 text-sm">Paste a video URL above to begin</p>
    </div>
  );

  if (useIframe) return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-gray-800">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title="Film Room Player"
      />
      <p className="text-gray-600 text-xs text-center py-1">
        Timestamp auto-capture available for direct video files (.mp4). For YouTube/Vimeo, enter timestamp manually when tagging.
      </p>
    </div>
  );

  return (
    <div className="w-full bg-black rounded-xl overflow-hidden border border-gray-800">
      <video
        ref={videoRef}
        src={url}
        controls
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
});

export default VideoPlayer;