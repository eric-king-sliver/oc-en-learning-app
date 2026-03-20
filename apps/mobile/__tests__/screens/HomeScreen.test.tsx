import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../../src/screens/HomeScreen';

import { useQuery } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

const mockNavigate = jest.fn();

const mockUser = {
  id: '1',
  email: 'test@example.com',
  displayName: 'John',
  currentProficiency: 'B1',
};

jest.mock('../../src/stores/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

jest.mock('../../src/services/api', () => ({
  api: {
    getHomeFeed: jest.fn(),
  },
}));

describe('HomeScreen', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFeedData = {
    data: {
      data: {
        dailyGoal: {
          current: 10,
          target: 15,
          progress: 66,
          completed: false,
        },
        continueLearning: [
          {
            scenarioId: 'scenario-1',
            progressPercent: 50,
            scenario: {
              title: 'At the Restaurant',
              difficulty: 'A2',
            },
          },
        ],
        recommendedScenarios: [
          {
            id: 'scenario-2',
            title: 'Job Interview',
            difficulty: 'B1',
            estimatedMinutes: 20,
          },
        ],
        stats: {
          scenariosCompleted: 5,
          totalPracticeMinutes: 120,
        },
      },
    },
  };

  it('renders loading state initially', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    });

    const { getByTestId, getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('Daily Goal')).toBeTruthy();
  });

  it('displays user greeting with display name', () => {
    mockUseQuery.mockReturnValue({
      data: mockFeedData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('Hello, John! 👋')).toBeTruthy();
  });

  it('displays user proficiency level', () => {
    mockUseQuery.mockReturnValue({
      data: mockFeedData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('Level: B1')).toBeTruthy();
  });

  it('displays daily goal progress', () => {
    mockUseQuery.mockReturnValue({
      data: mockFeedData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('Daily Goal')).toBeTruthy();
    expect(getByText('10/15 min')).toBeTruthy();
  });

  it('displays continue learning section when data available', () => {
    mockUseQuery.mockReturnValue({
      data: mockFeedData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('Continue Learning')).toBeTruthy();
    expect(getByText('At the Restaurant')).toBeTruthy();
  });

  it('displays recommended scenarios section', () => {
    mockUseQuery.mockReturnValue({
      data: mockFeedData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('Recommended for You')).toBeTruthy();
    expect(getByText('Job Interview')).toBeTruthy();
  });

  it('displays quick stats section', () => {
    mockUseQuery.mockReturnValue({
      data: mockFeedData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('Quick Stats')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();
    expect(getByText('Minutes')).toBeTruthy();
  });

  it('shows stat values correctly', () => {
    mockUseQuery.mockReturnValue({
      data: mockFeedData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('5')).toBeTruthy();
    expect(getByText('120')).toBeTruthy();
  });

  it('displays default greeting when user has no display name', () => {
    const userWithoutName = {
      ...mockUser,
      displayName: '',
    };

    jest.doMock('../../src/stores/AuthContext', () => ({
      useAuth: () => ({
        user: userWithoutName,
      }),
    }));

    mockUseQuery.mockReturnValue({
      data: mockFeedData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('Hello, Learner! 👋')).toBeTruthy();
  });

  it('handles empty feed data gracefully', () => {
    const emptyFeedData = {
      data: {
        data: {
          dailyGoal: { current: 0, target: 15, progress: 0, completed: false },
          continueLearning: [],
          recommendedScenarios: [],
          stats: { scenariosCompleted: 0, totalPracticeMinutes: 0 },
        },
      },
    };

    mockUseQuery.mockReturnValue({
      data: emptyFeedData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { queryByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(queryByText('Continue Learning')).toBeNull();
  });

  it('shows completed badge when daily goal is met', () => {
    const completedGoalData = {
      data: {
        data: {
          dailyGoal: {
            current: 15,
            target: 15,
            progress: 100,
            completed: true,
          },
          continueLearning: [],
          recommendedScenarios: [],
          stats: { scenariosCompleted: 0, totalPracticeMinutes: 0 },
        },
      },
    };

    mockUseQuery.mockReturnValue({
      data: completedGoalData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<HomeScreen navigation={mockNavigate} />);

    expect(getByText('✅ Goal completed!')).toBeTruthy();
  });
});
