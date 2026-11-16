import { Sparkles } from 'lucide-react';
import heroImage from '@/assets/hero-bg.jpg';

const HeroSection = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-8">
      <div 
        className="absolute inset-0 opacity-20"
        style={{ 
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="gradient-hero absolute inset-0 opacity-90" />
      
      <div className="relative px-6 py-12 sm:py-16">
        <div className="flex items-center justify-center mb-4">
          <div className="inline-flex items-center space-x-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered SQL Generation</span>
          </div>
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center text-foreground mb-4">
          LLM SQL Evaluation System
        </h1>
        
        <p className="text-lg sm:text-xl text-center text-muted-foreground max-w-3xl mx-auto mb-6">
          Compare <span className="text-primary font-semibold">cloud</span> vs <span className="text-secondary font-semibold">local</span> LLM models for SQL generation. 
          Evaluate speed, accuracy, cost, and privacy in real-time.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-foreground">OpenRouter • GPT/Gemini/Grok/Qwen</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-foreground">Ollama • Local Models</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
