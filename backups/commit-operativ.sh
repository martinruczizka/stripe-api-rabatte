#!/bin/bash
cd /workspaces/stripe-product-mapper
git remote set-url origin https://github.com/martinruczizka/stripe-api-rabatte.git
git add --all
git commit -m "Operatives Update: $(date +%Y-%m-%d_%H%M)"
git push origin main
