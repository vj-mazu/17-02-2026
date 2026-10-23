import React, { ReactNode } from 'react';
import styled from 'styled-components';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 0.5rem 0.5rem;
  max-width: 100% !important;
  width: 100% !important;
  margin: 0 !important;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0.25rem;
  }

  @media (max-width: 480px) {
    padding: 0.15rem;
  }
`;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <LayoutContainer>
      <Navbar />
      <MainContent>
        {children}
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout;
