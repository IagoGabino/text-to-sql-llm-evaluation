import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import { Database, Zap, Lock, DollarSign, Code, Users } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              About This Project
            </h1>
            <p className="text-lg text-muted-foreground">
              A comprehensive evaluation system for comparing LLM performance in SQL generation
            </p>
          </div>

          {/* Project Description */}
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Project Overview</h2>
            <p className="text-foreground mb-4">
              This is an academic project designed to evaluate and compare different Large Language Models (LLMs) 
              in their ability to generate SQL queries from natural language questions. The system allows users to 
              test various AI models and compare their performance across multiple dimensions.
            </p>
            <p className="text-foreground">
              The primary goal is to provide insights into the trade-offs between cloud-based models (OpenAI, Gemini, running through OpenRouter) 
              and locally-running models (Ollama) in terms of speed, accuracy, cost, and privacy.
            </p>
          </Card>

          {/* Comparison Factors */}
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">What We Compare</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Speed</h3>
                  <p className="text-sm text-muted-foreground">
                    Response time and query execution performance
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <Database className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Accuracy</h3>
                  <p className="text-sm text-muted-foreground">
                    Quality and correctness of generated SQL
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-warning/10 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Cost</h3>
                  <p className="text-sm text-muted-foreground">
                    API costs for cloud models vs free local models
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-accent/10 p-3 rounded-lg">
                  <Lock className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    Data handling: cloud transmission vs local processing
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Technologies */}
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
              <Code className="w-6 h-6 mr-2" />
              Technologies Used
            </h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-foreground min-w-[120px]">Frontend:</span>
                <span className="text-sm text-muted-foreground">React, TypeScript, TailwindCSS, shadcn/ui</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-foreground min-w-[120px]">Backend:</span>
                <span className="text-sm text-muted-foreground">Node.js, Express</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-foreground min-w-[120px]">AI Models:</span>
                <span className="text-sm text-muted-foreground">OpenRouter (GPT/Gemini), Ollama</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-foreground min-w-[120px]">Database:</span>
                <span className="text-sm text-muted-foreground">PostgreSQL</span>
              </div>
            </div>
          </Card>

          {/* Database Schema */}
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Database Schema</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The evaluation system uses a sample e-commerce database with the following structure:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm space-y-2">
              <div><span className="text-primary">• customers</span> - Customer information and profiles</div>
              <div><span className="text-primary">• products</span> - Product catalog with categories</div>
              <div><span className="text-primary">• orders</span> - Order transactions and status</div>
              <div><span className="text-primary">• order_items</span> - Individual items in each order</div>
              <div><span className="text-primary">• categories</span> - Product category hierarchy</div>
            </div>
          </Card>

          {/* Team */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2" />
              Academic Project
            </h2>
            <p className="text-foreground">
              This project was developed as part of an academic research initiative to study the practical 
              applications of Large Language Models in database query generation and to provide comparative 
              analysis between commercial and open-source AI solutions.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default About;
