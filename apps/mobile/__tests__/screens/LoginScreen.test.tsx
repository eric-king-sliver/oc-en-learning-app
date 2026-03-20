import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../../src/screens/LoginScreen';
import { AuthProvider } from '../../src/stores/AuthContext';

const mockLogin = jest.fn();

jest.mock('../../src/stores/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with email and password inputs', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={{}} />);

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
    expect(getByText("Don't have an account? Sign up")).toBeTruthy();
  });

  it('shows error when attempting login with empty fields', async () => {
    const { getByText } = render(<LoginScreen navigation={{}} />);

    const loginButton = getByText('Login');
    fireEvent.press(loginButton);

    const { Alert } = require('react-native');
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('calls login function with correct credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user: { id: '1', email: 'test@example.com', displayName: 'Test', currentProficiency: 'A1' },
          accessToken: 'token123',
        },
      }),
    } as Response);

    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={{}} />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Login');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays loading state while logging in', async () => {
    mockLogin.mockImplementation(() => new Promise((resolve) => {
      setTimeout(resolve, 100);
    }));

    const { getByText, getByPlaceholderText } = render(<LoginScreen navigation={{}} />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Login');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    expect(getByText('Logging in...')).toBeTruthy();
  });

  it('navigates to register screen when sign up link is pressed', () => {
    const mockNavigate = jest.fn();
    const { getByText } = render(<LoginScreen navigation={{ navigate: mockNavigate }} />);

    const signUpLink = getByText('Sign up');
    fireEvent.press(signUpLink);

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('displays title and subtitle correctly', () => {
    const { getByText } = render(<LoginScreen navigation={{}} />);

    expect(getByText('English Learning')).toBeTruthy();
    expect(getByText('Welcome back!')).toBeTruthy();
  });

  it('shows error alert when login fails', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));
    const alertSpy = jest.spyOn(require('react-native'), 'Alert');

    const { getByPlaceholderText, getByText } = render(<LoginScreen navigation={{}} />);

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const loginButton = getByText('Login');

    fireEvent.changeText(emailInput, 'wrong@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Login Failed', errorMessage);
    });
  });
});
