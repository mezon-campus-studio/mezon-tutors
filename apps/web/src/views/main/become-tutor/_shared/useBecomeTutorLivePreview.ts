'use client';

import {
  type TutorProfileAboutState,
  type TutorProfilePhotoState,
  joinLanguagesArray,
  joinProficienciesArray,
} from '@mezon-tutors/shared';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { useWatch, type Control, type FieldValues } from 'react-hook-form';
import {
  defaultPhotoState,
  tutorProfileAboutAtom,
  tutorProfileAvailabilityAtom,
  tutorProfileCertificationAtom,
  tutorProfileLivePreviewAtom,
  tutorProfilePhotoAtom,
  type TutorProfileLivePreviewPatch,
} from '@/store';


export function useBecomeTutorAboutPreviewSync(control: Control<FieldValues>) {
  const setLive = useSetAtom(tutorProfileLivePreviewAtom);
  const firstName = useWatch({ control, name: 'firstName' });
  const lastName = useWatch({ control, name: 'lastName' });
  const country = useWatch({ control, name: 'country' });
  const subject = useWatch({ control, name: 'subject' });
  const languageEntries = useWatch({ control, name: 'languageEntries' });

  useEffect(() => {
    const entries = ((languageEntries ?? []) as Array<{ language: string; proficiency: string }>).filter(
      (entry) => entry.language?.trim(),
    );
    setLive((prev) => ({
      ...prev,
      about: {
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        country: country ?? '',
        subject: subject ?? '',
        languages: joinLanguagesArray(entries.map((entry) => entry.language)),
        proficiencies: joinProficienciesArray(entries.map((entry) => entry.proficiency)),
      },
    }));
  }, [country, firstName, languageEntries, lastName, setLive, subject]);

  useEffect(() => {
    return () => {
      setLive((prev) => ({ ...prev, about: null }));
    };
  }, [setLive]);
}

export function useBecomeTutorPhotoPreviewSync(control: Control<FieldValues>) {
  const setLive = useSetAtom(tutorProfileLivePreviewAtom);
  const introduce = useWatch({ control, name: 'introduce' });
  const headline = useWatch({ control, name: 'headline' });
  const motivate = useWatch({ control, name: 'motivate' });

  useEffect(() => {
    setLive((prev) => ({
      ...prev,
      photo: {
        introduce: introduce ?? '',
        headline: headline ?? '',
        motivate: motivate ?? '',
      },
    }));
  }, [headline, introduce, motivate, setLive]);

  useEffect(() => {
    return () => {
      setLive((prev) => ({ ...prev, photo: null }));
    };
  }, [setLive]);
}

export function useBecomeTutorPreviewDraft() {
  const about = useAtomValue(tutorProfileAboutAtom);
  const photo = useAtomValue(tutorProfilePhotoAtom);
  const certification = useAtomValue(tutorProfileCertificationAtom);
  const availability = useAtomValue(tutorProfileAvailabilityAtom);
  const live = useAtomValue(tutorProfileLivePreviewAtom);

  return {
    about: mergeAboutPreview(about, live),
    photo: mergePhotoPreview(photo, live),
    certification,
    availability,
  };
}

function mergeAboutPreview(persisted: TutorProfileAboutState, live: TutorProfileLivePreviewPatch) {
  if (!live.about) return persisted;
  return { ...persisted, ...live.about };
}

function mergePhotoPreview(persisted: TutorProfilePhotoState, live: TutorProfileLivePreviewPatch) {
  if (!live.photo) return persisted;
  return {
    ...persisted,
    ...live.photo,
    photo: { ...defaultPhotoState.photo, ...persisted.photo },
    identity: { ...defaultPhotoState.identity, ...persisted.identity },
  };
}

export function resetTutorProfileLivePreview(setLive: ReturnType<typeof useSetAtom<typeof tutorProfileLivePreviewAtom>>) {
  setLive({ about: null, photo: null });
}
