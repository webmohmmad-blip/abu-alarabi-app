import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/dashboard");
  }, [setLocation]);
  return null;
}
