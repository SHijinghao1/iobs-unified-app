export const STATUS_ITEMS = [
  { id: 'bed_height_joint', label: '床高高度', value: '105', unit: 'mm', icon: 'H', progress: 65, status: 'normal' },
  { id: 'bed_tilt_joint', label: '前后倾斜', value: '30', unit: '°', icon: 'H', progress: 40, status: 'normal' },
  { id: 'bed_lateral_joint', label: '左右倾斜', value: '45', unit: '°', icon: 'B', progress: 55, status: 'normal' },
  { id: 'bed_front_back_joint', label: '前后移动', value: '20', unit: 'mm', icon: 'L', progress: 30, status: 'normal' },
  { id: 'bed_panel_back_joint', label: '背板角度', value: '10', unit: '°', icon: 'T', progress: 20, status: 'normal' },
  { id: 'bed_head_board_joint', label: '头板角度', value: '0', unit: '°', icon: 'T', progress: 0, status: 'normal' },
  { id: 'bed_panel_left_leg_joint', label: '左大腿角度', value: '0', unit: '°', icon: 'T', progress: 0, status: 'normal' },
  { id: 'bed_panel_left_leg_lower_joint', label: '左小腿角度', value: '0', unit: '°', icon: 'T', progress: 0, status: 'normal' },
  { id: 'bed_panel_right_leg_joint', label: '右大腿角度', value: '0', unit: '°', icon: 'S', progress: 10, status: 'normal' },
  { id: 'bed_panel_right_leg_lower_joint', label: '右小腿角度', value: '0', unit: '°', icon: 'S', progress: 0, status: 'normal' },
];

export const DSA_PARAMS = [
  { label: 'SID', value: '110', unit: 'cm' },
  { label: '角度', value: 'LAO 30', unit: '' },
  { label: '头向/尾向', value: 'CRA 15', unit: '' },
];

export const BED_SURFACES = [
  { id: 'standard', name: '标准床面', image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=300' },
  { id: 'carbon', name: '碳纤维透视床面', image: 'https://images.unsplash.com/photo-1579154212627-77227e8d2d6d?auto=format&fit=crop&q=80&w=300' },
  { id: 'ortho', name: '骨科牵引床面', image: 'https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?auto=format&fit=crop&q=80&w=300' },
  { id: 'spine', name: '脊柱专用床面', image: 'https://images.unsplash.com/photo-1583912267550-d44d4a3c5824?auto=format&fit=crop&q=80&w=300' },
  { id: 'obese', name: '肥胖专用床面', image: 'https://images.unsplash.com/photo-1581595221475-1014f2f32397?auto=format&fit=crop&q=80&w=300' },
  { id: 'xray', name: '超透X射线床面', image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=300' },
];
