// expo-router's Head without react-helmet-async (~30 KB). The game never sets document head tags. Web only.
import { Fragment } from 'react';

export const Head = () => null;
Head.Provider = Fragment;
