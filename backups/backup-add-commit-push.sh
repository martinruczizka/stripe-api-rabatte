#!/bin/bash
cd /workspaces/stripe-product-mapper
git add --all
git commit -m "Auto-Backup: $(date +%Y-%m-%d_%H%M)"
git push origin main
