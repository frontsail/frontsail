#!/usr/bin/env node

import { checkNodeVersion, hasEnoughSpace } from './checks'
import { initialPrompt } from './prompts'

if (hasEnoughSpace() && checkNodeVersion()) {
  initialPrompt()
}
