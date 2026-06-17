// LTTB 采样算法，用于大数据量降采样显示
export function downsampleLTTB<T>(data: T[], threshold: number, xAccessor: (d: T) => number, yAccessor: (d: T) => number): T[] {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold === 0) {
    return data; // 无需处理 (Nothing to do)
  }

  const sampled: T[] = [];
  let sampledIndex = 0;

  // 桶的大小。为起点和终点数据点留出空间 (Bucket size. Leave room for start and end data points)
  const every = (dataLength - 2) / (threshold - 2);

  let a = 0;
  let maxAreaPoint: T;
  let maxArea: number;
  let area: number;
  let nextA: number;

  sampled[sampledIndex++] = data[a]; // 始终添加第一个点 (Always add the first point)

  for (let i = 0; i < threshold - 2; i++) {
    // 计算下一个桶（包含 c）的平均点 (Calculate point average for next bucket (containing c))
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * every) + 1;
    let avgRangeEnd = Math.floor((i + 2) * every) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += xAccessor(data[avgRangeStart]);
      avgY += yAccessor(data[avgRangeStart]);
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // 获取当前桶的范围 (Get the range for this bucket)
    let rangeOffs = Math.floor((i + 0) * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    // 点 a (Point a)
    const pointAX = xAccessor(data[a]);
    const pointAY = yAccessor(data[a]);

    maxArea = area = -1;

    for (; rangeOffs < rangeTo; rangeOffs++) {
      // 计算跨越三个桶的三角形面积 (Calculate triangle area over three buckets)
      area = Math.abs(
        (pointAX - avgX) * (yAccessor(data[rangeOffs]) - pointAY) -
          (pointAX - xAccessor(data[rangeOffs])) * (avgY - pointAY)
      ) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[rangeOffs];
        nextA = rangeOffs;
      }
    }

    sampled[sampledIndex++] = maxAreaPoint!; // 从桶中选取该点 (Pick this point from the bucket)
    a = nextA!; // 这个 a 是下一个 a（选中的 b） (This a is the next a (chosen b))
  }

  sampled[sampledIndex++] = data[dataLength - 1]; // 始终添加最后一个点 (Always add last)

  return sampled;
}
