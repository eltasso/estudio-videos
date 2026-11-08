import React from 'react';
import {Composition} from 'remotion';
import {comps} from './gen/manifest';

export const Root: React.FC = () => (<>{comps.map((c) => (
  <Composition key={c.id} id={c.id} component={c.C as any} width={1920} height={1080} fps={30} durationInFrames={c.frames} />
))}</>);
