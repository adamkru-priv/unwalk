import { useState, useEffect } from 'react';
import { useHealthKit } from '../../../hooks/useHealthKit';

interface StepsHistoryChartProps {
  isOpen: boolean;
  onClose: () => void;
}

type TimeRange = 'week' | 'month' | 'year';

interface DayData {
  date: string;
  steps: number;
  label: string;
}

export function StepsHistoryChart({ isOpen, onClose }: StepsHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [cachedData, setCachedData] = useState<Record<TimeRange, DayData[]>>({
    week: [],
    month: [],
    year: []
  });
  
  const { getStepsHistory } = useHealthKit();

  useEffect(() => {
    if (isOpen) {
      loadData(timeRange);
    }
  }, [isOpen, timeRange]);

  const loadData = async (range: TimeRange) => {
    // Check cache first
    if (cachedData[range].length > 0) {
      setData(cachedData[range]);
      return;
    }

    setLoading(true);
    try {
      const days = range === 'week' ? 7 : range === 'month' ? 30 : 365;
      const history = await getStepsHistory(days);
      
      const formattedData: DayData[] = history.map((item, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - index));
        
        let label = '';
        if (range === 'week') {
          label = date.toLocaleDateString('en-US', { weekday: 'short' });
        } else if (range === 'month') {
          label = date.getDate().toString();
        } else {
          label = date.toLocaleDateString('en-US', { month: 'short' });
        }
        
        return {
          date: date.toISOString().split('T')[0],
          steps: item.steps,
          label
        };
      });

      setData(formattedData);
      setCachedData(prev => ({ ...prev, [range]: formattedData }));
    } catch (error) {
      console.error('Failed to load steps history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const maxSteps = Math.max(...data.map(d => d.steps), 10000);
  const avgSteps = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.steps, 0) / data.length) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Steps History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-4">
            <div className="flex-1 text-center">
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {avgSteps.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Average</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {maxSteps.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Best Day</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">No data available</div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Bar Chart */}
              <div className="flex items-end justify-between gap-1 h-48">
                {data.map((item, index) => {
                  const height = (item.steps / maxSteps) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-purple-600 rounded-t-lg transition-all hover:opacity-80"
                          style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                          title={`${item.steps.toLocaleString()} steps`}
                        />
                      </div>
                      <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate w-full text-center">
                        {item.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Y-axis labels */}
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-2">
                <span>0</span>
                <span>{(maxSteps / 2).toLocaleString()}</span>
                <span>{maxSteps.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
