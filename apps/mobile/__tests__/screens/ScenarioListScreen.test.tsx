import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ScenarioListScreen } from '../../src/screens/ScenarioListScreen';

import { useQuery } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

const mockNavigate = jest.fn();

jest.mock('../../src/services/api', () => ({
  api: {
    getScenarios: jest.fn(),
  },
}));

describe('ScenarioListScreen', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockScenariosData = {
    data: {
      data: {
        scenarios: [
          {
            id: 'scenario-1',
            title: 'At the Restaurant',
            description: 'Learn to order food and make reservations',
            difficulty: 'A2',
            category: 'daily_conversation',
            estimatedMinutes: 15,
            statistics: { dialogueCount: 10 },
          },
          {
            id: 'scenario-2',
            title: 'Job Interview',
            description: 'Practice common interview questions',
            difficulty: 'B1',
            category: 'interview',
            estimatedMinutes: 20,
            statistics: { dialogueCount: 15 },
          },
          {
            id: 'scenario-3',
            title: 'At the Airport',
            description: 'Navigate through airport procedures',
            difficulty: 'A1',
            category: 'travel',
            estimatedMinutes: 10,
            statistics: { dialogueCount: 8 },
          },
        ],
      },
    },
  };

  it('renders search input and title', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByPlaceholderText, getByText } = render(
      <ScenarioListScreen navigation={mockNavigate} />
    );

    expect(getByText('Learn English')).toBeTruthy();
    expect(getByPlaceholderText('Search scenarios...')).toBeTruthy();
  });

  it('renders category filter chips', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<ScenarioListScreen navigation={mockNavigate} />);

    expect(getByText('All')).toBeTruthy();
    expect(getByText('Daily')).toBeTruthy();
    expect(getByText('Business')).toBeTruthy();
    expect(getByText('Travel')).toBeTruthy();
    expect(getByText('Social')).toBeTruthy();
    expect(getByText('Interview')).toBeTruthy();
  });

  it('renders difficulty filter chips', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getAllByText } = render(<ScenarioListScreen navigation={mockNavigate} />);

    expect(getAllByText('A1').length).toBeGreaterThan(0);
    expect(getAllByText('A2').length).toBeGreaterThan(0);
    expect(getAllByText('B1').length).toBeGreaterThan(0);
    expect(getAllByText('B2').length).toBeGreaterThan(0);
    expect(getAllByText('C1').length).toBeGreaterThan(0);
    expect(getAllByText('C2').length).toBeGreaterThan(0);
  });

  it('displays scenario cards with correct information', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<ScenarioListScreen navigation={mockNavigate} />);

    expect(getByText('At the Restaurant')).toBeTruthy();
    expect(getByText('Job Interview')).toBeTruthy();
    expect(getByText('At the Airport')).toBeTruthy();
  });

  it('displays scenario metadata', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<ScenarioListScreen navigation={mockNavigate} />);

    expect(getByText('📚 10 dialogues')).toBeTruthy();
    expect(getByText('⏱️ 15 min')).toBeTruthy();
  });

  it('displays difficulty badges with correct colors', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getAllByText } = render(<ScenarioListScreen navigation={mockNavigate} />);

    expect(getAllByText('A2').length).toBeGreaterThan(0);
    expect(getAllByText('B1').length).toBeGreaterThan(0);
    expect(getAllByText('A1').length).toBeGreaterThan(0);
  });

  it('shows empty state when no scenarios found', () => {
    const emptyData = {
      data: {
        data: {
          scenarios: [],
        },
      },
    };

    mockUseQuery.mockReturnValue({
      data: emptyData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<ScenarioListScreen navigation={mockNavigate} />);

    expect(getByText('No scenarios found')).toBeTruthy();
  });

  it('allows category selection', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<ScenarioListScreen navigation={mockNavigate} />);

    const dailyButton = getByText('Daily');
    fireEvent.press(dailyButton);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['scenarios', 'daily_conversation', null, ''],
      })
    );
  });

  it('allows difficulty selection', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getAllByText } = render(<ScenarioListScreen navigation={mockNavigate} />);

    const b1Buttons = getAllByText('B1');
    fireEvent.press(b1Buttons[0]);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['scenarios', 'all', 'B1', ''],
      })
    );
  });

  it('allows search input', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByPlaceholderText } = render(
      <ScenarioListScreen navigation={mockNavigate} />
    );

    const searchInput = getByPlaceholderText('Search scenarios...');
    fireEvent.changeText(searchInput, 'restaurant');

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['scenarios', 'all', null, 'restaurant'],
      })
    );
  });

  it('navigates to scenario detail when card is pressed', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const navigation = { navigate: jest.fn() };
    const { getByText } = render(<ScenarioListScreen navigation={navigation} />);

    const scenarioCard = getByText('At the Restaurant');
    fireEvent.press(scenarioCard);

    expect(navigation.navigate).toHaveBeenCalledWith('ScenarioDetail', {
      scenarioId: 'scenario-1',
    });
  });

  it('displays scenario descriptions', () => {
    mockUseQuery.mockReturnValue({
      data: mockScenariosData,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(<ScenarioListScreen navigation={mockNavigate} />);

    expect(getByText('Learn to order food and make reservations')).toBeTruthy();
    expect(getByText('Practice common interview questions')).toBeTruthy();
  });
});
