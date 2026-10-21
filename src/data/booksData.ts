import { Book } from '@/types/book';

export const PUBLISHED_BOOKS: Book[] = [
  {
    id: 'book-ml-dl-fundamentals',
    slug: 'ml-deep-learning-fundamentals',
    title: 'ML + Deep Learning Fundamentals',
    subtitle: 'Full Beginner to GenAI Edition',
    author: 'Slayer',
    authorRealName: 'Medicharla Ravi Kiran',
    authorSlug: 'slayer',
    coverImage: '/images/ml-deep-learning-cover.jpg',
    description:
      'A structured, step-by-step path from essential mathematical foundations and classical machine learning toward modern neural networks, Transformers, and Generative AI.',
    synopsis:
      'Written by AI/ML Engineer and Full-Stack Developer Slayer (Medicharla Ravi Kiran), this comprehensive volume eliminates guesswork for readers seeking a solid technical bridge from classical statistical learning to state-of-the-art Generative AI. Beginning with foundational data manipulation, linear models, and classification mechanics, the book progresses into deep neural network architectures, backpropagation calculus, convolutional computer vision, sequence processing, self-attention, and LLM foundations. Every concept is accompanied by intuition, mathematical reasoning, and hands-on Python implementations.',
    category: 'Artificial Intelligence & Machine Learning',
    tags: [
      'Machine Learning',
      'Deep Learning',
      'Generative AI',
      'Neural Networks',
      'Transformers',
      'PyTorch',
      'Python',
    ],
    edition: 'First Edition (2026)',
    publishedYear: 2026,
    publicationStatus: 'Available Free',
    totalChapters: 8,
    estimatedReadingTimeMinutes: 180,
    isFree: true,
    allowPdfDownload: false,
    chapters: [
      {
        id: 'ch-1',
        chapterNumber: 1,
        slug: 'chapter-1-foundations-of-machine-learning',
        title: 'Foundations of Machine Learning & Essential Data Tools',
        readingTimeMinutes: 22,
        summary:
          'Understanding the machine learning paradigm, differentiating classical programming from statistical learning, and mastering core data representations.',
        sections: [
          {
            title: '1.1 The Machine Learning Paradigm Shift',
            content:
              'In traditional software engineering, developers write deterministic rules that transform known inputs into expected outputs. In machine learning, this dynamic is inverted: we supply inputs alongside observed outputs, and the learning algorithm discovers the underlying statistical patterns and transformation rules. This paradigm shift enables machines to generalize across noisy, high-dimensional spaces where hand-crafted conditional logic breaks down.',
            callout: {
              type: 'concept',
              text: 'Classical: Input + Rules = Output. Machine Learning: Input + Output = Discovered Rules and Parameters.',
            },
          },
          {
            title: '1.2 Linear Algebra and Vectorized Representations',
            content:
              'All modern machine learning algorithms operate on tensors—multidimensional arrays of numbers. Whether processing tabular features, acoustic waveforms, pixel grids, or token embeddings, data must first be transformed into continuous vector spaces. Understanding matrix operations, dot products, eigenvalues, and cosine similarity is non-negotiable for diagnosing gradient flow and latent representations.',
            codeSnippet: {
              language: 'python',
              code: `import numpy as np

# Representing sample feature vectors (N samples, D dimensions)
X = np.array([
    [1.2, 0.4, 3.1],
    [0.9, 2.1, 1.8],
    [2.5, 1.1, 0.7]
])

# Weight vector and bias term
W = np.array([0.5, -0.2, 0.8])
b = 0.15

# Forward affine transformation: y = XW + b
linear_projection = np.dot(X, W) + b
print("Projected outputs:", linear_projection)`,
            },
          },
          {
            title: '1.3 Data Preprocessing and Feature Pipelines',
            content:
              'Real-world data is inherently flawed—suffering from missing values, skewness, outliers, and differing scales. Feature scaling techniques such as Min-Max Normalization and Z-score Standardization guarantee that optimization routines (like Stochastic Gradient Descent) do not oscillate uncontrollably across disparate dimension magnitudes.',
            callout: {
              type: 'tip',
              text: 'Never fit scalers on your validation or test sets. Always compute parameters strictly on training splits to prevent data leakage.',
            },
          },
        ],
      },
      {
        id: 'ch-2',
        chapterNumber: 2,
        slug: 'chapter-2-supervised-learning-mechanics',
        title: 'Supervised Learning — From Linear Regressions to Ensemble Trees',
        readingTimeMinutes: 25,
        summary:
          'Deep dive into loss functions, gradient descent optimization, regularization methods (L1/L2), and decision forest ensembles.',
        sections: [
          {
            title: '2.1 Formulating Objective Functions and Cost Surfaces',
            content:
              'Supervised learning relies on minimizing a quantifiable penalty between predicted outputs and ground-truth labels. In continuous regression tasks, Mean Squared Error (MSE) penalizes large residual deviations quadratically. In classification tasks, Cross-Entropy Loss evaluates the divergence between true categorical distributions and model probability predictions.',
          },
          {
            title: '2.2 Gradient Descent Dynamics',
            content:
              'Optimization is the engine of learning. Gradient descent updates weights in the negative direction of the loss gradient. The learning rate controls step magnitude: too small leads to glacial convergence or local minima traps; too large causes catastrophic numerical divergence.',
            codeSnippet: {
              language: 'python',
              code: `def gradient_descent_step(weights, gradients, learning_rate=0.01):
    """
    Standard first-order parameter update rule.
    W_new = W_old - lr * dL/dW
    """
    return weights - (learning_rate * gradients)`,
            },
          },
          {
            title: '2.3 Regularization and Combatting Overfitting',
            content:
              'When a hypothesis class is overly flexible relative to sample count, the model memorizes idiosyncratic noise rather than universal patterns. L2 Regularization (Ridge) adds a penalty proportional to the sum of squared weights, shrinking parameters smoothly. L1 Regularization (Lasso) penalizes absolute weight magnitudes, enforcing parameter sparsity and automatic feature selection.',
            callout: {
              type: 'concept',
              text: 'Bias-Variance Tradeoff: High bias implies underfitting (oversimplified hypothesis); high variance implies overfitting (excessive sensitivity to sample fluctuations).',
            },
          },
        ],
      },
      {
        id: 'ch-3',
        chapterNumber: 3,
        slug: 'chapter-3-unsupervised-learning-dimensionality',
        title: 'Unsupervised Exploration, Clustering & Dimensionality Reduction',
        readingTimeMinutes: 20,
        summary:
          'Discovering hidden topologies, clustering centroids, Principal Component Analysis, and modern manifold embeddings.',
        sections: [
          {
            title: '3.1 The Value of Unlabeled Data',
            content:
              'Unlabeled data represents the overwhelming majority of information in digital ecosystems. Unsupervised algorithms uncover latent clusters, anomalous deviations, and low-dimensional manifolds without human annotations. K-Means establishes cluster centroids through iterative expectation-maximization updates.',
          },
          {
            title: '3.2 Principal Component Analysis (PCA)',
            content:
              'High-dimensional datasets frequently suffer from the curse of dimensionality—data becomes sparse, Euclidean distances lose discriminative meaning, and computation expands exponentially. PCA computes orthogonal eigenvectors that capture directions of maximum dataset variance.',
            codeSnippet: {
              language: 'python',
              code: `from sklearn.decomposition import PCA
import numpy as np

# Reduce high-dimensional latent space to 2 principal components
pca = PCA(n_components=2)
reduced_data = pca.fit_transform(X)
print("Explained variance ratios:", pca.explained_variance_ratio_)`,
            },
          },
        ],
      },
      {
        id: 'ch-4',
        chapterNumber: 4,
        slug: 'chapter-4-deep-neural-networks-backpropagation',
        title: 'Deep Neural Networks, Backpropagation & Optimization',
        readingTimeMinutes: 28,
        summary:
          'Multi-layer perceptrons, activation non-linearities, computational graphs, and reverse-mode automatic differentiation.',
        sections: [
          {
            title: '4.1 Non-Linear Activations: Breaking Affine Limits',
            content:
              'Without non-linear activation functions, stacking dozens of dense layers mathematically collapses into a single linear matrix multiplication. Functions such as ReLU (Rectified Linear Unit), Leaky ReLU, and GELU introduce non-linear decision boundaries, enabling neural networks to act as universal function approximators.',
          },
          {
            title: '4.2 The Calculus of Backpropagation',
            content:
              'Backpropagation is reverse-mode automatic differentiation applied to a computational graph. By leveraging the multivariate chain rule, we compute partial derivatives of the scalar loss with respect to every weight and bias across arbitrary network depths in a single backward pass.',
            callout: {
              type: 'concept',
              text: 'dL/dw_i = (dL/dy) * (dy/dz) * (dz/dw_i). Dynamic graphs store forward intermediate activations to compute these local derivatives efficiently.',
            },
            codeSnippet: {
              language: 'python',
              code: `import torch
import torch.nn as nn

class FeedForwardNetwork(nn.Module):
    def __init__(self, input_dim=64, hidden_dim=128, output_dim=10):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, output_dim)
        )
        
    def forward(self, x):
        return self.network(x)`,
            },
          },
        ],
      },
      {
        id: 'ch-5',
        chapterNumber: 5,
        slug: 'chapter-5-convolutional-vision-architectures',
        title: 'Convolutional Networks & Visual Feature Representations',
        readingTimeMinutes: 24,
        summary:
          'Spatial hierarchies, weight sharing, receptive fields, residual connections (ResNet), and visual representation learning.',
        sections: [
          {
            title: '5.1 Inductive Biases in Visual Computing',
            content:
              'Dense layers ignore spatial geometry: flattening an image discards neighborhood pixel relationships. Convolutional kernels introduce translation equivariance and local spatial locality—meaning a learned edge or texture filter detects features regardless of position in the visual field.',
          },
          {
            title: '5.2 Residual Learning: Overcoming Vanishing Gradients',
            content:
              'As neural networks grow deeper (50+ layers), gradient signals vanish during backward propagation. He et al. introduced residual skip connections (H(x) = F(x) + x), allowing identity signals to bypass non-linear layers and enabling stable optimization of networks with hundreds of layers.',
          },
        ],
      },
      {
        id: 'ch-6',
        chapterNumber: 6,
        slug: 'chapter-6-sequence-modeling-and-attention',
        title: 'Sequence Modeling, Recurrent Networks & Attention',
        readingTimeMinutes: 25,
        summary:
          'Temporal dependencies, vanishing gradients in RNNs, LSTMs, and the evolutionary emergence of the Attention mechanism.',
        sections: [
          {
            title: '6.1 The Challenge of Sequential Context',
            content:
              'Language, audio, and sensor telemetry inherently exhibit temporal dependencies. While standard Recurrent Neural Networks (RNNs) and Long Short-Term Memory (LSTM) cells maintained hidden internal states across time-steps, their sequential nature created two crippling bottlenecks: gradient degradation over long sequences, and inability to parallelize across modern GPU clusters.',
          },
          {
            title: '6.2 Soft Alignment and Query-Key Matching',
            content:
              'The breakthrough of Attention (Bahdanau et al.) eliminated the rigid fixed-vector bottleneck by allowing decoders to dynamically look back across all encoder states and allocate attention weights based on contextual relevance.',
          },
        ],
      },
      {
        id: 'ch-7',
        chapterNumber: 7,
        slug: 'chapter-7-transformer-architecture-self-attention',
        title: 'The Transformer Architecture — Self-Attention Demystified',
        readingTimeMinutes: 30,
        summary:
          'Scaled dot-product attention, multi-head projections, positional encodings, layer normalization, and encoder-decoder topologies.',
        sections: [
          {
            title: '7.1 Scaled Dot-Product Attention Mechanics',
            content:
              'In 2017, "Attention Is All You Need" replaced recurrence entirely with self-attention. Every token projects into three distinct vectors: Query (Q), Key (K), and Value (V). The compatibility score between queries and keys determines how much weight is placed on each value vector.',
            callout: {
              type: 'concept',
              text: 'Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V',
            },
            codeSnippet: {
              language: 'python',
              code: `import torch
import torch.nn.functional as F
import math

def scaled_dot_product_attention(Q, K, V, mask=None):
    d_k = Q.size(-1)
    # Compute raw compatibility scores
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
    
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)
        
    weights = F.softmax(scores, dim=-1)
    output = torch.matmul(weights, V)
    return output, weights`,
            },
          },
          {
            title: '7.2 Multi-Head Attention and Representation Subspaces',
            content:
              'Rather than computing a single attention distribution, Multi-Head Attention projects Q, K, and V into multiple lower-dimensional subspaces. This allows the model to simultaneously attend to syntax, semantics, coreferences, and positional relationships.',
          },
        ],
      },
      {
        id: 'ch-8',
        chapterNumber: 8,
        slug: 'chapter-8-modern-generative-ai-and-llms',
        title: 'Modern Generative AI, Large Language Models & Future Frontiers',
        readingTimeMinutes: 26,
        summary:
          'Autoregressive pre-training, scaling laws, instruction tuning, RLHF/DPO alignment, inference quantization, and AI engineering practices.',
        sections: [
          {
            title: '8.1 Causal Language Modeling and Next-Token Prediction',
            content:
              'Modern Generative AI systems (such as GPT-style decoders and open-weight models like LLaMA) are trained on the deceptively simple objective of causal next-token prediction across petabytes of text. Through scale and compute, next-token prediction induces emergent reasoning, code synthesis, translation, and structured extraction.',
          },
          {
            title: '8.2 Post-Training: Alignment and Instruction Tuning',
            content:
              'Raw pre-trained foundation models are autocomplete engines prone to babbling or toxic completions. Supervised Fine-Tuning (SFT) and Direct Preference Optimization (DPO) align foundation models into steerable, helpful, and safe assistants.',
            callout: {
              type: 'tip',
              text: 'As an AI/ML developer, understanding quantization (4-bit, 8-bit NF4) and parameter-efficient fine-tuning (LoRA / QLoRA) allows you to adapt foundation models directly on consumer-grade hardware.',
            },
          },
          {
            title: '8.3 The Path Forward for Practitioners',
            content:
              'The boundary between software engineering and AI has dissolved. Modern full-stack developers must master vector embeddings, retrieval-augmented generation (RAG), prompt chaining, evaluation harnesses, and inference latency optimization to build resilient, intelligent systems.',
          },
        ],
      },
    ],
  },
];

// Helper methods for typed service
export function getAllBooks(): Book[] {
  return PUBLISHED_BOOKS;
}

export function getBookBySlug(slug: string): Book | undefined {
  return PUBLISHED_BOOKS.find((b) => b.slug === slug);
}

export function getChapterBySlug(bookSlug: string, chapterSlug: string) {
  const book = getBookBySlug(bookSlug);
  if (!book) return undefined;
  return book.chapters.find((ch) => ch.slug === chapterSlug);
}

export function getFeaturedBook(): Book {
  return PUBLISHED_BOOKS[0];
}
