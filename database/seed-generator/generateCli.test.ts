/**
 * Unit Tests for generateCli.ts CLI
 */

import { parseArguments } from './generateCli';
import { PRESETS } from './constants';

describe('parseArguments', () => {
  // Store original process.argv
  const originalArgv = process.argv;

  // Helper to set process.argv
  const setArgs = (args: string[]) => {
    process.argv = ['node', 'generateCli.ts', ...args];
  };

  // Restore original process.argv after each test
  afterEach(() => {
    process.argv = originalArgv;
  });

  // Test case: Should parse valid small preset
  it('should parse --preset small correctly', () => {
    setArgs(['--preset', 'small']);
    const config = parseArguments();
    
    expect(config.preset).toBe('small');
    expect(config.outputDir).toBe('../seed-data/generated/small');
  });

  // Test case: Should parse valid medium preset
  it('should parse --preset medium correctly', () => {
    setArgs(['--preset', 'medium']);
    const config = parseArguments();
    
    expect(config.preset).toBe('medium');
    expect(config.outputDir).toBe('../seed-data/generated/medium');
  });

  // Test case: Should parse valid large preset
  it('should parse --preset large correctly', () => {
    setArgs(['--preset', 'large']);
    const config = parseArguments();
    
    expect(config.preset).toBe('large');
    expect(config.outputDir).toBe('../seed-data/generated/large');
  });

  // Test case: Should parse valid xlarge preset
  it('should parse --preset xlarge correctly', () => {
    setArgs(['--preset', 'xlarge']);
    const config = parseArguments();
    
    expect(config.preset).toBe('xlarge');
    expect(config.outputDir).toBe('../seed-data/generated/xlarge');
  });

  // Test case: Should throw error if --preset argument is missing
  it('should throw error if --preset argument is missing', () => {
    setArgs([]);
    
    expect(() => parseArguments()).toThrow('Missing --preset argument');
  });

  // Test case: Should throw error if --preset has no value
  it('should throw error if --preset has no value', () => {
    setArgs(['--preset']);
    
    expect(() => parseArguments()).toThrow('Missing --preset argument');
  });

  // Test case: Should throw error for invalid preset name
  it('should throw error for invalid preset name', () => {
    setArgs(['--preset', 'invalid']);
    
    expect(() => parseArguments()).toThrow('Invalid preset: invalid');
  });

  // Test case: Should throw error for typo in preset name
  it('should throw error for typo in preset name', () => {
    setArgs(['--preset', 'smal']);
    
    expect(() => parseArguments()).toThrow('Invalid preset: smal');
  });

  // Test case: Should validate preset exists in PRESETS constant
  it('should validate preset exists in PRESETS constant', () => {
    setArgs(['--preset', 'small']);
    const config = parseArguments();
    
    expect(PRESETS[config.preset]).toBeDefined();
    expect(PRESETS[config.preset].name).toBe('small');
  });

  // Test case: Should handle extra arguments gracefully
  it('should handle extra arguments gracefully', () => {
    setArgs(['--preset', 'medium', '--extra', 'value']);
    const config = parseArguments();
    
    expect(config.preset).toBe('medium');
  });

  // Test case: Output directory should follow convention
  it('should generate correct output directory path', () => {
    const presets = ['small', 'medium', 'large', 'xlarge'];
    
    presets.forEach(preset => {
      setArgs(['--preset', preset]);
      const config = parseArguments();
      
      expect(config.outputDir).toBe(`../seed-data/generated/${preset}`);
    });
  });
});
