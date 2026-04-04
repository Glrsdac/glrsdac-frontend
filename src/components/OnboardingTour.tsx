import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

const TOUR_STORAGE_PREFIX = "glrsdac-onboarding-seen-v1";

type TourStep = {
  title: string;
  description: string;
  path: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to your Dashboard",
    description:
      "This is your home screen. It summarizes your key activity and gives quick access to your most-used features.",
    path: "/",
  },
  {
    title: "Track your contributions",
    description:
      "Use this page to review your giving history and personal contribution records.",
    path: "/portal/member/my-contributions",
  },
  {
    title: "Read church updates",
    description:
      "Find announcements, programs, newsletters, and recent church activities here.",
    path: "/portal/member/church-updates",
  },
  {
    title: "Use the calendar",
    description:
      "Browse upcoming programs and events by month, week, day, or agenda view.",
    path: "/portal/member/calendar",
  },
  {
    title: "Manage your account",
    description:
      "Update your profile and password from Account Settings anytime.",
    path: "/portal/member/account-settings",
  },
];

export function OnboardingTour() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const storageKey = useMemo(
    () => (user?.id ? `${TOUR_STORAGE_PREFIX}:${user.id}` : ""),
    [user?.id]
  );

  useEffect(() => {
    if (!storageKey) return;

    const hasSeen = window.localStorage.getItem(storageKey) === "true";
    if (hasSeen) {
      setOpen(false);
      return;
    }

    setStepIndex(0);
    setOpen(true);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const currentStep = TOUR_STEPS[stepIndex];
    if (!currentStep) return;

    if (location.pathname !== currentStep.path) {
      navigate(currentStep.path, { replace: false });
    }
  }, [open, stepIndex, location.pathname, navigate]);

  const completeTour = () => {
    if (storageKey) {
      window.localStorage.setItem(storageKey, "true");
    }
    setOpen(false);
  };

  const goNext = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      completeTour();
      return;
    }

    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    navigate(TOUR_STEPS[nextIndex].path);
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    const previousIndex = stepIndex - 1;
    setStepIndex(previousIndex);
    navigate(TOUR_STEPS[previousIndex].path);
  };

  if (!open || !user?.id) return null;

  const step = TOUR_STEPS[stepIndex];

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[420px]">
        <Card className="border-primary/20 bg-background/95 shadow-xl backdrop-blur">
          <CardHeader className="pb-2">
            <p className="text-xs font-medium text-muted-foreground">
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </p>
            <CardTitle className="text-lg">{step.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={completeTour}>
                Skip tour
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goBack} disabled={stepIndex === 0}>
                  Back
                </Button>
                <Button size="sm" onClick={goNext}>
                  {stepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
