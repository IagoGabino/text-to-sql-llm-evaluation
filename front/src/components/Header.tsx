import { Link } from 'react-router-dom';
import { Database, Info } from 'lucide-react';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="bg-primary p-2 rounded-lg shadow-glow group-hover:scale-105 transition-smooth">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">LLM SQL Evaluator</h1>
              <p className="text-xs text-muted-foreground">Compare AI Models</p>
            </div>
          </Link>
          
          <nav className="flex items-center space-x-4">
            <Link 
              to="/about" 
              className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-accent/10 transition-smooth text-sm font-medium text-foreground"
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
