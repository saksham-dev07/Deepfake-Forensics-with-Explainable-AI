#!/usr/bin/env python3
#-*- coding: utf-8 -*-

import torch
import torch.nn as nn

class S(nn.Module):
    """Checkpoint-compatible SyncNet v2 architecture.

    Contract: audio [B, 1, 13, 20] PCM-scale MFCCs; video
    [B, 3, 5, 224, 224] unnormalized BGR pixels. Embeddings are distances,
    not authenticity probabilities. The v2 code differs from the paper's
    original 256-dimensional grayscale network; do not mix their checkpoints.
    """
    def __init__(self, num_layers_in_fc_layers = 1024):
        super().__init__()

        self.__nFeatures__ = 24
        self.__nChs__ = 32
        self.__midChs__ = 32

        self.netcnnaud = nn.Sequential(
            nn.Conv2d(1, 64, kernel_size=(3,3), stride=(1,1), padding=(1,1)),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=(1,1), stride=(1,1)),

            nn.Conv2d(64, 192, kernel_size=(3,3), stride=(1,1), padding=(1,1)),
            nn.BatchNorm2d(192),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=(3,3), stride=(1,2)),

            nn.Conv2d(192, 384, kernel_size=(3,3), padding=(1,1)),
            nn.BatchNorm2d(384),
            nn.ReLU(inplace=True),

            nn.Conv2d(384, 256, kernel_size=(3,3), padding=(1,1)),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),

            nn.Conv2d(256, 256, kernel_size=(3,3), padding=(1,1)),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=(3,3), stride=(2,2)),

            nn.Conv2d(256, 512, kernel_size=(5,4), padding=(0,0)),
            nn.BatchNorm2d(512),
            nn.ReLU(),
        )

        self.netfcaud = nn.Sequential(
            nn.Linear(512, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Linear(512, num_layers_in_fc_layers),
        )

        self.netfclip = nn.Sequential(
            nn.Linear(512, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Linear(512, num_layers_in_fc_layers),
        )

        self.netcnnlip = nn.Sequential(
            nn.Conv3d(3, 96, kernel_size=(5,7,7), stride=(1,2,2), padding=0),
            nn.BatchNorm3d(96),
            nn.ReLU(inplace=True),
            nn.MaxPool3d(kernel_size=(1,3,3), stride=(1,2,2)),

            nn.Conv3d(96, 256, kernel_size=(1,5,5), stride=(1,2,2), padding=(0,1,1)),
            nn.BatchNorm3d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool3d(kernel_size=(1,3,3), stride=(1,2,2), padding=(0,1,1)),

            nn.Conv3d(256, 256, kernel_size=(1,3,3), padding=(0,1,1)),
            nn.BatchNorm3d(256),
            nn.ReLU(inplace=True),

            nn.Conv3d(256, 256, kernel_size=(1,3,3), padding=(0,1,1)),
            nn.BatchNorm3d(256),
            nn.ReLU(inplace=True),

            nn.Conv3d(256, 256, kernel_size=(1,3,3), padding=(0,1,1)),
            nn.BatchNorm3d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool3d(kernel_size=(1,3,3), stride=(1,2,2)),

            nn.Conv3d(256, 512, kernel_size=(1,6,6), padding=0),
            nn.BatchNorm3d(512),
            nn.ReLU(inplace=True),
        )

    def forward_aud(self, x):
        if x.ndim != 4 or tuple(x.shape[1:]) != (1, 13, 20):
            raise ValueError("SyncNet audio input must have shape [B, 1, 13, 20]")
        mid = self.netcnnaud(x)  # N x ch x 24 x M
        mid = mid.view((mid.size(0), -1))  # N x (ch x 24)
        out = self.netfcaud(mid)

        return out

    def forward_lip(self, x):
        if x.ndim != 5 or tuple(x.shape[1:]) != (3, 5, 224, 224):
            raise ValueError("SyncNet video input must have shape [B, 3, 5, 224, 224]")
        mid = self.netcnnlip(x)
        mid = mid.view((mid.size(0), -1))  # N x (ch x 24)
        out = self.netfclip(mid)

        return out

    def forward_lipfeat(self, x):
        if x.ndim != 5 or tuple(x.shape[1:]) != (3, 5, 224, 224):
            raise ValueError("SyncNet video input must have shape [B, 3, 5, 224, 224]")
        mid = self.netcnnlip(x)
        out = mid.view((mid.size(0), -1))  # N x (ch x 24)

        return out
