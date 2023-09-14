import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { server } from "@/lib/axios";

interface Prompts {
  id: string;
  title: string;
  template: string;
}

interface PromptSelectProps {
  onPromptSelected: (template: string) => void;
}

export function PromptSelect({ onPromptSelected }: PromptSelectProps) {
  const [prompts, setPrompts] = useState<Prompts[]>([]);

  const handlePromptSelection = (promptId: string): void => {
    const selectedPrompt = prompts.find(prompt => prompt.id === promptId)?.template || '';
    onPromptSelected(selectedPrompt); 
  }

  useEffect(() => {
    server.get('/prompts').then(response => {
      setPrompts(response.data);
    });
  }, []);

  return (
    <Select onValueChange={handlePromptSelection}>
      <SelectTrigger>
        <SelectValue placeholder='Selecione um prompt...' />
      </SelectTrigger>
      <SelectContent>
        {prompts.map(prompt => (
          <SelectItem key={prompt.id} value={prompt.id}>{prompt.title}</SelectItem>  
        ))}

      </SelectContent>
    </Select>
  );
}
