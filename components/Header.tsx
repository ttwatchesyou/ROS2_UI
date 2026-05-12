import React, { useState } from "react";
import styled from "styled-components";
import { Layout } from "antd";
import { Divide as HamburgerDivide } from "hamburger-react";
import { useRouter } from "next/router";

const { Header } = Layout;

const HeaderComponent: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const router = useRouter();

  return (
    <StyledHeader>
      <WrapperHeader>
        <HeadLogo
          alt="logo"
          onClick={() => router.push("/")}
          src="/logo/MechaLogo.png"
        />
        {/* <NameTag>
         Department of Mechatronics and Robotics, Rayong Technical College
        </NameTag> */}
        <DesktopMenuSection>
          <StyledButton onClick={() => router.push("/Service")}>
            Service
          </StyledButton>
          <StyledButton onClick={() => router.push("/RobotTuner")}>
            Tuner
          </StyledButton>
          <StyledButton onClick={() => router.push("/TelemetryPage")}>
            Telemetry
          </StyledButton>
          <StyledButton onClick={() => router.push("/Control")}>
            Control
          </StyledButton>
          {/* <StyledButton onClick={() => router.push("/Mission")}>
            Mission
          </StyledButton> */}
        </DesktopMenuSection>

        <MobileMenuIcon onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <HamburgerDivide toggle={setIsMenuOpen} toggled={isMenuOpen} />
        </MobileMenuIcon>

        {isMenuOpen && (
          <>
            <MobileMenu isMenuOpen={isMenuOpen}>
              <StyledButton onClick={() => router.push("/Service")}>
                Service
              </StyledButton>
              <StyledButton onClick={() => router.push("/RobotTuner")}>
                Tuner
              </StyledButton>
              <StyledButton onClick={() => router.push("/TelemetryPage")}>
                Telemetry
              </StyledButton>
              <StyledButton onClick={() => router.push("/Control")}>
                Control
              </StyledButton>
              {/* <StyledButton onClick={() => router.push("/Mission")}>
                Mission
              </StyledButton> */}
            </MobileMenu>
            <Overlay onClick={() => setIsMenuOpen(false)} />
          </>
        )}
      </WrapperHeader>
    </StyledHeader>
  );
};

export default HeaderComponent;

// Style components
const NameTag = styled.div`
  font-family: Prompt;
  font-size: 16px;
  font-weight: 500;
  line-height: 16px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  word-wrap: break-word;
  @media (max-width: 1024px) {
    font-size: 22px;
    line-height: 32px;
  }
`;

const StyledButton = styled.div`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  color: #ffdc7c;
  font-family: Prompt;
  font-size: 16px;
  font-weight: 500;
  line-height: 16px;
  border: none;
  background: transparent;
  position: relative;
  text-align: center;
  white-space: nowrap;
  word-wrap: break-word;
  cursor: pointer;
  padding: 10px 20px;

  &:hover {
    color: #a6e1d1 !important;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background-color: #a6e1d1;
    transition: width 0.3s ease;
  }

  &:hover::after {
    width: 100%;
  }

  &:active {
    outline: none !important;
    box-shadow: none !important;
    color: #a6e1d1;
  }

  .ant-btn:focus,
  .ant-btn:active {
    outline: none !important;
    box-shadow: none !important;
  }

  @media (max-width: 1024px) {
    font-size: 22px;
    line-height: 32px;
    padding: 10px 16px;
  }

  @media (max-width: 767px) {
    padding: 8px 12px;
    font-size: 12px;
    line-height: 22px;
  }
`;

const StyledHeader = styled(Header)`
  background-color: #1e3271;
  width: 100%;
  height: 80px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
  position: sticky;
  top: 0px;
  z-index: 10;
`;

const WrapperHeader = styled.div`
  width: 100%;
  max-width: 1920px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  @media (max-width: 1024px) {
  }
`;

const HeadLogo = styled.img`
  width: 100%;
  max-width: 120px;
  height: auto;
  margin: 0;
  cursor: pointer;
  @media (max-width: 1024px) {
    max-width: 100px;
  }
`;

const DesktopMenuSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  @media (max-width: 1024px) {
    display: none;
  }
`;

const MobileMenuIcon = styled.div`
  display: none;
  font-size: 24px;
  cursor: pointer;
  color: #2f638a;

  @media (max-width: 1024px) {
    display: block;
  }
`;

interface MobileMenuProps {
  isMenuOpen: boolean;
}

const MobileMenu = styled.div<MobileMenuProps>`
  position: fixed;
  gap: 32px;
  top: 0;
  right: 0;
  width: 100%;
  height: 50vh;
  background: white;
  box-shadow: -4px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  padding: 16px;
  transform: ${({ isMenuOpen }) =>
    isMenuOpen ? "translateX(0)" : "translateX(100%)"};
  transition: transform 0.3s ease-in-out;
  z-index: 15;

  @media (max-width: 767px) {
    gap: 12px;
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  z-index: 10;
`;
