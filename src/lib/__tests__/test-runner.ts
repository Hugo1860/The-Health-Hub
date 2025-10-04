// 简单的测试运行器，不依赖外部测试框架

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
}

class SimpleTestRunner {
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;

  describe(name: string, fn: () => void): void {
    this.currentSuite = { name, tests: [] };
    this.suites.push(this.currentSuite);
    
    try {
      fn();
    } catch (error) {
      console.error(`Error in test suite "${name}":`, error);
    }
  }

  it(name: string, fn: () => void | Promise<void>): void {
    if (!this.currentSuite) {
      throw new Error('Test must be inside a describe block');
    }

    try {
      const result = fn();
      
      if (result instanceof Promise) {
        result
          .then(() => {
            this.currentSuite!.tests.push({ name, passed: true });
          })
          .catch((error) => {
            this.currentSuite!.tests.push({ 
              name, 
              passed: false, 
              error: error.message 
            });
          });
      } else {
        this.currentSuite.tests.push({ name, passed: true });
      }
    } catch (error) {
      this.currentSuite.tests.push({ 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  expect(actual: any): {
    toBe: (expected: any) => void;
    toEqual: (expected: any) => void;
    toBeDefined: () => void;
    toBeUndefined: () => void;
    toBeNull: () => void;
    toBeTruthy: () => void;
    toBeFalsy: () => void;
    toContain: (expected: any) => void;
    toHaveLength: (expected: number) => void;
    toBeGreaterThan: (expected: number) => void;
    toBeLessThan: (expected: number) => void;
    toBeGreaterThanOrEqual: (expected: number) => void;
    toHaveProperty: (expected: string) => void;
    not: any;
  } {
    const matchers = {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error(`Expected ${actual} to be defined`);
        }
      },
      toBeUndefined: () => {
        if (actual !== undefined) {
          throw new Error(`Expected ${actual} to be undefined`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected ${actual} to be null`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${actual} to be truthy`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected ${actual} to be falsy`);
        }
      },
      toContain: (expected: any) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      },
      toHaveLength: (expected: number) => {
        if (actual.length !== expected) {
          throw new Error(`Expected ${actual} to have length ${expected}, got ${actual.length}`);
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan: (expected: number) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toBeGreaterThanOrEqual: (expected: number) => {
        if (actual < expected) {
          throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
        }
      },
      toHaveProperty: (expected: string) => {
        if (!(expected in actual)) {
          throw new Error(`Expected ${actual} to have property ${expected}`);
        }
      }
    };

    // 添加 not 支持
    const notMatchers = Object.keys(matchers).reduce((acc, key) => {
      acc[key] = (...args: any[]) => {
        try {
          (matchers as any)[key](...args);
          throw new Error(`Expected not to match, but it did`);
        } catch (error) {
          // 如果原始匹配器抛出错误，那么 not 匹配器应该成功
          if (error.message.includes('Expected not to match')) {
            throw error;
          }
        }
      };
      return acc;
    }, {} as any);

    return {
      ...matchers,
      not: notMatchers
    };
  }

  run(): void {
    console.log('🧪 Running ShareCard Tests...\n');
    
    let totalTests = 0;
    let passedTests = 0;

    this.suites.forEach(suite => {
      console.log(`📋 ${suite.name}`);
      
      suite.tests.forEach(test => {
        totalTests++;
        if (test.passed) {
          passedTests++;
          console.log(`  ✅ ${test.name}`);
        } else {
          console.log(`  ❌ ${test.name}`);
          if (test.error) {
            console.log(`     Error: ${test.error}`);
          }
        }
      });
      
      console.log('');
    });

    console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed!');
    } else {
      console.log(`⚠️  ${totalTests - passedTests} tests failed`);
    }
  }
}

// 创建全局测试实例
const testRunner = new SimpleTestRunner();

// 导出全局函数
export const describe = testRunner.describe.bind(testRunner);
export const it = testRunner.it.bind(testRunner);
export const expect = testRunner.expect.bind(testRunner);
export const runTests = testRunner.run.bind(testRunner);

// Mock 函数
export const jest = {
  fn: () => {
    const mockFn = (...args: any[]) => mockFn.mock.results[mockFn.mock.calls.length - 1]?.value;
    mockFn.mock = {
      calls: [] as any[][],
      results: [] as any[],
      instances: [] as any[]
    };
    return mockFn;
  },
  clearAllMocks: () => {
    // 简单实现，实际项目中可能需要更复杂的逻辑
  }
};