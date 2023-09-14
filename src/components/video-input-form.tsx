import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { FileVideo, Upload } from "lucide-react";
import { fetchFile } from '@ffmpeg/util';
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { getFFmpeg } from "@/lib/ffmpeg";
import { server } from "@/lib/axios";

type Status = 'waiting' | 'converting' | 'uploading' | 'generate' | 'success';

const statusMessages = {
  'converting': 'Convertendo...',
  'generate': 'Transcrevendo...',
  'uploading': 'Carregando...',
  'success': 'Sucesso!',
};

interface VideoInputFormProps {
  onVideoUploaded: (videoId: string) => void;
}

export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('waiting');

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.currentTarget;

    if (!files) {
      return;
    }

    const selectedFile = files.item(0);
    setVideoFile(selectedFile);
  }

  const convertVideoToAudio = async (video: File) => {
    console.log('start');

    const ffmpeg = await getFFmpeg();
    await ffmpeg.writeFile('input.mp4', await fetchFile(video));

    // ffmpeg.on('log', log => {
    //   console.log('error: ', log);
    // });

    ffmpeg.on('progress', progress => {
      console.log('Progresso: ', Math.round(progress.progress * 100));
    });

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3',
    ]);

    const data = await ffmpeg.readFile('output.mp3');
    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' });
    const audioFile = new File([audioFileBlob], 'audio.mp3', { type: 'audio/mpeg' });

    console.log('finalizado');

    return audioFile;
  }

  const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = promptInputRef.current?.value;

    if (!videoFile) {
      return;
    }

    setStatus('converting');

    const audioFile = await convertVideoToAudio(videoFile);
    const data = new FormData();

    data.append('file', audioFile);

    setStatus('uploading');

    await server.post('/videos', data).then(async response => {
      const result = response.data;
      const videoId = result.video.id;

      setStatus('generate');

      await server.post(`/videos/${videoId}/transcription`, { prompt: prompt || '' });

      setStatus('success');
      onVideoUploaded(videoId);
    }).catch(() => { });
  }

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return undefined;
    }

    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  return (
    <form className='space-y-6' onSubmit={handleUploadVideo}>
      <label
        htmlFor="video"
        className='relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gab-2 items-center justify-center text-muted-foreground hover:bg-primary/5'
      >
        {videoFile ? (
          <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
        ) : (
          <>
            <FileVideo className='w-4 h-4' />
            Selecione um vídeo
          </>
        )}
      </label>
      <input type="file" id='video' accept='video/mp4' className='sr-only' onChange={handleFileSelected} />

      <Separator />

      <div className='space-y-2'>
        <Label htmlFor='transcription_prompt'> Prompt de transcrição </Label>
        <Textarea
          id='transcription_prompt'
          className='h-20 leading-relaxed resize-none'
          placeholder='Inclua palavras-chaves mencionadas no vídeo separadas por vírgula (,)'
          ref={promptInputRef}
          disabled={status !== 'waiting'}
        />
      </div>

      <Button 
        data-success={status === 'success'}
        disabled={status !== 'waiting'} 
        type='submit' 
        className='w-full data-[success=true]:bg-emerald-400'
      >
        {status === 'waiting' ? (
          <>
            Carregar video
            <Upload className='w-4 h-4 ml-2' />
          </>
        ) : statusMessages[status]}
      </Button>
    </form>
  );
}
