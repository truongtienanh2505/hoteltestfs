import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  UploadOutlined,
} from '@ant-design/icons';
import roomTypeApi from '../../api/roomTypeApi';
import amenityApi from '../../api/amenityApi';
import './roomTypeManagement.css';

const { TextArea } = Input;

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.title ||
  fallbackMessage;

const isAbsoluteImageUrl = (value = '') =>
  /^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:');

const resolveImageSrc = (value, fallbackFolder = '') => {
  if (!value) return '';
  if (isAbsoluteImageUrl(value) || value.startsWith('/')) return value;
  return fallbackFolder ? `/${fallbackFolder}/${value}` : value;
};

const getRoomImageItems = (record) => {
  const images = Array.isArray(record?.images)
    ? record.images.filter((item) => !!item?.imageUrl)
    : [];

  if (images.length > 0) return images;

  return record?.imageUrl
    ? [{ id: 'legacy', imageUrl: record.imageUrl, isPrimary: true }]
    : [];
};

const getFeaturedRoomImages = (record) => {
  const images = getRoomImageItems(record);
  const featuredImage = images.find((item) => item.isPrimary);

  if (featuredImage) return [featuredImage];
  return images.length > 0 ? [images[0]] : [];
};

const buildPreviewUrl = (file) => {
  if (file?.url) return file.url;
  if (file?.thumbUrl) return file.thumbUrl;
  if (file?.originFileObj) return URL.createObjectURL(file.originFileObj);
  return '';
};

const RoomTypeManagement = () => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [roomTypeKeyword, setRoomTypeKeyword] = useState('');
  const [amenityKeyword, setAmenityKeyword] = useState('');

  const [isRoomTypeModalOpen, setIsRoomTypeModalOpen] = useState(false);
  const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false);

  const [editingRoomType, setEditingRoomType] = useState(null);
  const [editingAmenity, setEditingAmenity] = useState(null);

  const [roomTypeForm] = Form.useForm();
  const [amenityForm] = Form.useForm();

  const [imageFileList, setImageFileList] = useState([]);
  const [existingRoomImages, setExistingRoomImages] = useState([]);
  const [deletedRoomImageIds, setDeletedRoomImageIds] = useState([]);
  const [primaryImageChoices, setPrimaryImageChoices] = useState([]);
  const [amenityImageFileList, setAmenityImageFileList] = useState([]);

  const fetchData = async () => {
    setPageLoading(true);
    try {
      const [roomTypeData, amenityData] = await Promise.all([
        roomTypeApi.getAll(),
        amenityApi.getAll(),
      ]);

      setRoomTypes(roomTypeData || []);
      setAmenities(amenityData || []);
    } catch (error) {
      message.error(getErrorMessage(error, 'Không thể tải dữ liệu loại phòng và tiện ích.'));
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRoomTypes = useMemo(() => {
    const keyword = roomTypeKeyword.trim().toLowerCase();
    if (!keyword) return roomTypes;

    return roomTypes.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const description = item.description?.toLowerCase() || '';
      return name.includes(keyword) || description.includes(keyword);
    });
  }, [roomTypes, roomTypeKeyword]);

  const filteredAmenities = useMemo(() => {
    const keyword = amenityKeyword.trim().toLowerCase();
    if (!keyword) return amenities;

    return amenities.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      return name.includes(keyword);
    });
  }, [amenities, amenityKeyword]);

  const stats = useMemo(() => {
    const totalRoomTypes = roomTypes.length;
    const totalAmenities = amenities.length;
    const averagePrice =
      totalRoomTypes === 0
        ? 0
        : roomTypes.reduce((sum, item) => sum + Number(item.basePrice || 0), 0) / totalRoomTypes;
    const totalRoomTypesWithImage = roomTypes.filter((item) => getRoomImageItems(item).length > 0).length;

    return {
      totalRoomTypes,
      totalAmenities,
      averagePrice,
      totalRoomTypesWithImage,
    };
  }, [roomTypes, amenities]);

  const resetRoomTypeModal = () => {
    setEditingRoomType(null);
    setImageFileList([]);
    setExistingRoomImages([]);
    setDeletedRoomImageIds([]);
    setPrimaryImageChoices([]);
    roomTypeForm.resetFields();
    roomTypeForm.setFieldsValue({
      capacityAdults: 1,
      capacityChildren: 0,
      amenityIds: [],
    });
  };

  const resetAmenityModal = () => {
    setEditingAmenity(null);
    setAmenityImageFileList([]);
    amenityForm.resetFields();
  };

  const openCreateRoomTypeModal = () => {
    resetRoomTypeModal();
    setIsRoomTypeModalOpen(true);
  };

  const openEditRoomTypeModal = (record) => {
    const currentImages = getRoomImageItems(record).filter((item) => item.id !== 'legacy');
    const currentFeaturedImage = currentImages.find((item) => item.isPrimary);
    const currentFeaturedChoices = currentFeaturedImage ? [`existing-${currentFeaturedImage.id}`] : [];

    setEditingRoomType(record);
    setImageFileList([]);
    setExistingRoomImages(currentImages);
    setDeletedRoomImageIds([]);
    setPrimaryImageChoices(currentFeaturedChoices);

    roomTypeForm.setFieldsValue({
      name: record.name,
      basePrice: Number(record.basePrice || 0),
      capacityAdults: Number(record.capacityAdults || 0),
      capacityChildren: Number(record.capacityChildren || 0),
      description: record.description,
      amenityIds: (record.amenities || []).map((item) => item.id),
    });
    setIsRoomTypeModalOpen(true);
  };

  const openCreateAmenityModal = () => {
    resetAmenityModal();
    setIsAmenityModalOpen(true);
  };

  const openEditAmenityModal = (record) => {
    setEditingAmenity(record);
    setAmenityImageFileList([]);
    amenityForm.setFieldsValue({
      name: record.name,
    });
    setIsAmenityModalOpen(true);
  };

  const handleCloseRoomTypeModal = () => {
    setIsRoomTypeModalOpen(false);
    resetRoomTypeModal();
  };

  const handleCloseAmenityModal = () => {
    setIsAmenityModalOpen(false);
    resetAmenityModal();
  };

  const togglePrimaryImageChoice = (choice, checked) => {
    setPrimaryImageChoices(checked ? [choice] : []);
  };

  const getFallbackPrimaryChoice = (nextExistingImages = existingRoomImages, nextNewImages = imageFileList) => {
    if (nextExistingImages.length > 0) return `existing-${nextExistingImages[0].id}`;
    if (nextNewImages.length > 0) return `new-${nextNewImages[0].uid}`;
    return null;
  };

  const handleRoomImagesChange = ({ fileList }) => {
    const nextList = fileList.filter(
      (file) => file.type?.startsWith('image/') || file.originFileObj?.type?.startsWith('image/')
    );

    setImageFileList(nextList);

    setPrimaryImageChoices((prev) => {
      const currentChoice = prev[0];
      const currentChoiceStillExists = currentChoice
        ? currentChoice.startsWith('existing-')
          ? existingRoomImages.some((image) => `existing-${image.id}` === currentChoice)
          : nextList.some((file) => `new-${file.uid}` === currentChoice)
        : false;

      if (currentChoiceStillExists) return [currentChoice];

      const fallbackChoice = getFallbackPrimaryChoice(existingRoomImages, nextList);
      return fallbackChoice ? [fallbackChoice] : [];
    });
  };

  const handleRemoveExistingRoomImage = (image) => {
    const nextImages = existingRoomImages.filter((item) => item.id !== image.id);
    const removedChoice = `existing-${image.id}`;

    setExistingRoomImages(nextImages);
    setDeletedRoomImageIds((prev) => [...new Set([...prev, image.id])]);

    setPrimaryImageChoices((prev) => {
      if (prev[0] !== removedChoice) return prev;
      const fallbackChoice = getFallbackPrimaryChoice(nextImages, imageFileList);
      return fallbackChoice ? [fallbackChoice] : [];
    });
  };

  const handleRemoveNewRoomImage = (file) => {
    const nextFiles = imageFileList.filter((item) => item.uid !== file.uid);
    const removedChoice = `new-${file.uid}`;

    setImageFileList(nextFiles);

    setPrimaryImageChoices((prev) => {
      if (prev[0] !== removedChoice) return prev;
      const fallbackChoice = getFallbackPrimaryChoice(existingRoomImages, nextFiles);
      return fallbackChoice ? [fallbackChoice] : [];
    });
  };

  const handleSubmitRoomType = async (values) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', values.name.trim());
      formData.append('description', values.description?.trim() || '');
      formData.append('basePrice', values.basePrice);
      formData.append('capacityAdults', values.capacityAdults);
      formData.append('capacityChildren', values.capacityChildren);

      imageFileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('images', file.originFileObj);
        }
      });

      deletedRoomImageIds.forEach((id) => {
        formData.append('deletedImageIds', id);
      });

      primaryImageChoices.forEach((choice) => {
        if (choice.startsWith('existing-')) {
          formData.append('primaryImageIds', choice.replace('existing-', ''));
          return;
        }

        if (choice.startsWith('new-')) {
          const uid = choice.replace('new-', '');
          const primaryIndex = imageFileList.findIndex((file) => file.uid === uid);
          if (primaryIndex >= 0) {
            formData.append('primaryImageIndexes', primaryIndex);
          }
        }
      });

      if (primaryImageChoices.length === 0 && imageFileList.length > 0 && existingRoomImages.length === 0) {
        formData.append('primaryImageIndexes', 0);
      }

      let roomTypeId = editingRoomType?.id;

      if (editingRoomType) {
        await roomTypeApi.update(editingRoomType.id, formData);
      } else {
        const response = await roomTypeApi.create(formData);
        roomTypeId = response?.roomTypeId;
      }

      if (roomTypeId) {
        await roomTypeApi.updateAmenities(roomTypeId, values.amenityIds || []);
      }

      message.success(
        editingRoomType
          ? 'Cập nhật loại phòng thành công.'
          : 'Tạo loại phòng thành công.'
      );

      handleCloseRoomTypeModal();
      fetchData();
    } catch (error) {
      message.error(getErrorMessage(error, 'Lưu loại phòng thất bại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAmenity = async (values) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', values.name.trim());

      if (amenityImageFileList[0]?.originFileObj) {
        formData.append('iconFile', amenityImageFileList[0].originFileObj);
      }

      if (editingAmenity) {
        await amenityApi.update(editingAmenity.id, formData);
        message.success('Cập nhật tiện ích thành công.');
      } else {
        await amenityApi.create(formData);
        message.success('Tạo tiện ích thành công.');
      }

      handleCloseAmenityModal();
      fetchData();
    } catch (error) {
      message.error(getErrorMessage(error, 'Lưu tiện ích thất bại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoomType = async (id) => {
    try {
      await roomTypeApi.remove(id);
      message.success('Đã xóa loại phòng.');
      fetchData();
    } catch (error) {
      message.error(getErrorMessage(error, 'Xóa loại phòng thất bại.'));
    }
  };

  const handleDeleteAmenity = async (id) => {
    try {
      await amenityApi.remove(id);
      message.success('Đã xóa tiện ích.');
      fetchData();
    } catch (error) {
      message.error(getErrorMessage(error, 'Xóa tiện ích thất bại.'));
    }
  };

  const renderRoomImageCell = (_, record) => {
    const images = getRoomImageItems(record);
    const featuredImages = getFeaturedRoomImages(record);

    if (featuredImages.length === 0) {
      return <div className="room-type-empty-image">Chưa có ảnh</div>;
    }

    return (
      <div className="room-type-image-stack-cell">
        <Image.PreviewGroup>
          {featuredImages.slice(0, 3).map((image) => (
            <div className="room-type-image-cell" key={`${image.id}-${image.imageUrl}`}>
              <Image
                src={resolveImageSrc(image.imageUrl)}
                alt={record.name}
                width={76}
                height={58}
                style={{ objectFit: 'cover', borderRadius: 12 }}
              />
              <Tag color="gold" className="room-type-featured-tag">
                <StarFilled /> Nổi bật
              </Tag>
            </div>
          ))}
        </Image.PreviewGroup>
        <Badge count={images.length} size="small" title={`${images.length} ảnh`} />
      </div>
    );
  };

  const renderAmenityImage = (value, name = 'ảnh tiện ích') => {
    if (!value) {
      return <div className="amenity-icon-empty">Chưa có ảnh</div>;
    }

    return (
      <div className="amenity-icon-cell">
        <Image
          src={resolveImageSrc(value, 'amenities')}
          alt={name}
          width={46}
          height={46}
          style={{ objectFit: 'contain', borderRadius: 10 }}
          fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='92' height='92'><rect width='100%25' height='100%25' rx='16' fill='%23f6f0df'/><text x='50%25' y='54%25' text-anchor='middle' font-family='Arial' font-size='13' fill='%23946f22'>Anh</text></svg>"
        />
      </div>
    );
  };

  const roomTypeColumns = [
    {
      title: 'Ảnh nổi bật',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 135,
      render: renderRoomImageCell,
    },
    {
      title: 'Tên loại phòng',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (value) => <span style={{ fontWeight: 700 }}>{value}</span>,
    },
    {
      title: 'Giá cơ bản',
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 160,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Sức chứa',
      key: 'capacity',
      width: 160,
      render: (_, record) => (
        <div>
          <div>Người lớn: {record.capacityAdults}</div>
          <div>Trẻ em: {record.capacityChildren}</div>
        </div>
      ),
    },
    {
      title: 'Tiện ích',
      dataIndex: 'amenities',
      key: 'amenities',
      width: 320,
      render: (items) =>
        items?.length ? (
          <Space size={[0, 8]} wrap>
            {items.map((item) => (
              <Tag key={item.id} color="gold" className="room-type-amenity-tag">
                <span className="room-type-amenity-tag__icon">
                  {renderAmenityImage(item.iconUrl, item.name)}
                </span>
                {item.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <span className="room-type-muted">Chưa gán tiện ích</span>
        ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 420,
      render: (value) =>
        value ? (
          <div className="room-type-description-cell">{value}</div>
        ) : (
          <span className="room-type-muted">Chưa có mô tả</span>
        ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap>
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEditRoomTypeModal(record)}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Xóa loại phòng"
            description={`Bạn chắc chắn muốn xóa "${record.name}"?`}
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDeleteRoomType(record.id)}
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const amenityColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center',
    },
    {
      title: 'Hình ảnh',
      dataIndex: 'iconUrl',
      key: 'iconUrl',
      width: 120,
      render: (value, record) => renderAmenityImage(value, record.name),
    },
    {
      title: 'Tên tiện ích',
      dataIndex: 'name',
      key: 'name',
      render: (value) => <span style={{ fontWeight: 700 }}>{value}</span>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 170,
      render: (_, record) => (
        <Space wrap>
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEditAmenityModal(record)}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Xóa tiện ích"
            description={`Bạn chắc chắn muốn xóa "${record.name}"?`}
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDeleteAmenity(record.id)}
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const roomTypeTabContent = (
    <Card className="room-type-module-card">
      <div className="room-type-toolbar">
        <div className="room-type-toolbar__left">
          <Input
            value={roomTypeKeyword}
            onChange={(e) => setRoomTypeKeyword(e.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Tìm theo tên loại phòng hoặc mô tả..."
            allowClear
            style={{ width: 320 }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Tải lại
          </Button>
        </div>

        <div className="room-type-toolbar__right">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRoomTypeModal}>
            Thêm loại phòng
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        loading={pageLoading}
        columns={roomTypeColumns}
        dataSource={filteredRoomTypes}
        bordered
        scroll={{ x: 1550 }}
        pagination={{
          pageSize: 5,
          showSizeChanger: true,
          pageSizeOptions: [5, 10, 20],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} loại phòng`,
        }}
      />
    </Card>
  );

  const amenityTabContent = (
    <Card className="room-type-module-card">
      <div className="room-type-toolbar">
        <div className="room-type-toolbar__left">
          <Input
            value={amenityKeyword}
            onChange={(e) => setAmenityKeyword(e.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Tìm theo tên tiện ích..."
            allowClear
            style={{ width: 320 }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Tải lại
          </Button>
        </div>

        <div className="room-type-toolbar__right">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateAmenityModal}>
            Thêm tiện ích
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        loading={pageLoading}
        columns={amenityColumns}
        dataSource={filteredAmenities}
        bordered
        pagination={{
          pageSize: 5,
          showSizeChanger: true,
          pageSizeOptions: [5, 10, 20],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} tiện ích`,
        }}
      />
    </Card>
  );

  return (
    <div className="room-type-page">
      <div className="room-type-hero room-type-hero--simple">
        <div className="room-type-hero__title">Quản lý Loại phòng &amp; Tiện ích</div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="room-type-stat-card">
            <Statistic title="Tổng loại phòng" value={stats.totalRoomTypes} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="room-type-stat-card">
            <Statistic title="Tổng tiện ích" value={stats.totalAmenities} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="room-type-stat-card">
            <Statistic title="Giá trung bình" value={formatCurrency(stats.averagePrice)} />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="room-type-stat-card">
            <Statistic title="Loại phòng có ảnh" value={stats.totalRoomTypesWithImage} />
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="room-types"
        items={[
          {
            key: 'room-types',
            label: (
              <span>
                <AppstoreOutlined /> Loại phòng
              </span>
            ),
            children: roomTypeTabContent,
          },
          {
            key: 'amenities',
            label: (
              <span>
                <AppstoreOutlined /> Tiện ích
              </span>
            ),
            children: amenityTabContent,
          },
        ]}
      />

      <Modal
        title={editingRoomType ? 'Cập nhật loại phòng' : 'Thêm loại phòng'}
        open={isRoomTypeModalOpen}
        onCancel={handleCloseRoomTypeModal}
        footer={null}
        destroyOnHidden
        width={920}
      >
        <Form form={roomTypeForm} layout="vertical" onFinish={handleSubmitRoomType}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Tên loại phòng"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên loại phòng.' },
                  { min: 3, message: 'Tên loại phòng phải từ 3 ký tự.' },
                ]}
              >
                <Input placeholder="Ví dụ: Deluxe hướng biển" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="basePrice"
                label="Giá cơ bản"
                rules={[{ required: true, message: 'Vui lòng nhập giá cơ bản.' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="Nhập giá cơ bản"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={(value) => (value || '').replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="capacityAdults"
                label="Sức chứa người lớn"
                rules={[{ required: true, message: 'Vui lòng nhập số người lớn.' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="capacityChildren"
                label="Sức chứa trẻ em"
                rules={[{ required: true, message: 'Vui lòng nhập số trẻ em.' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={4} placeholder="Nhập mô tả loại phòng..." />
          </Form.Item>

          <Form.Item
            name="amenityIds"
            label="Gán tiện ích cho loại phòng"
            tooltip="Chọn nhiều tiện ích áp dụng cho cùng một hạng phòng."
          >
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Chọn các tiện ích áp dụng cho loại phòng"
              options={amenities.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Form.Item>

          <div className="room-type-gallery-panel">
            <div className="room-type-section-label">Ảnh loại phòng &amp; ảnh nổi bật</div>
            <div className="room-type-help-text">
            
            </div>

            <div className="room-type-gallery-grid">
              <div className="room-type-gallery-upload-card">
                <Upload
                  beforeUpload={() => false}
                  multiple
                  accept="image/*"
                  fileList={imageFileList}
                  onChange={handleRoomImagesChange}
                  listType="picture-card"
                  showUploadList={false}
                >
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>Thêm ảnh</div>
                  </div>
                </Upload>
              </div>

              {existingRoomImages.map((image) => {
                const choice = `existing-${image.id}`;
                return (
                  <div className="room-type-gallery-item" key={choice}>
                    <Image
                      src={resolveImageSrc(image.imageUrl)}
                      alt="Ảnh loại phòng"
                      className="room-type-gallery-image"
                    />
                    <div className="room-type-gallery-actions">
                      <Radio
                        checked={primaryImageChoices.includes(choice)}
                        onChange={(event) => togglePrimaryImageChoice(choice, event.target.checked)}
                      >
                        Ảnh nổi bật
                      </Radio>
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveExistingRoomImage(image)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                );
              })}

              {imageFileList.map((file) => {
                const choice = `new-${file.uid}`;
                return (
                  <div className="room-type-gallery-item" key={choice}>
                    <Image
                      src={buildPreviewUrl(file)}
                      alt={file.name}
                      className="room-type-gallery-image"
                    />
                    <div className="room-type-gallery-actions">
                      <Radio
                        checked={primaryImageChoices.includes(choice)}
                        onChange={(event) => togglePrimaryImageChoice(choice, event.target.checked)}
                      >
                        Ảnh nổi bật
                      </Radio>
                      <Space size={6} wrap>
                        <Tag color="blue">Ảnh mới</Tag>
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveNewRoomImage(file)}
                        >
                          Xóa
                        </Button>
                      </Space>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {editingRoomType?.imageUrl && existingRoomImages.length === 0 && imageFileList.length === 0 && (
            <div className="room-type-current-image">
              <div className="room-type-section-label">Ảnh hiện tại</div>
              <img
                src={editingRoomType.imageUrl}
                alt={editingRoomType.name}
                className="room-type-preview-image"
              />
              <div className="room-type-muted">Ảnh cũ đang lưu theo đường dẫn Cloudinary.</div>
            </div>
          )}

          <div className="room-type-modal-footer">
            <Button onClick={handleCloseRoomTypeModal}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingRoomType ? 'Lưu cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title={editingAmenity ? 'Cập nhật tiện ích' : 'Thêm tiện ích'}
        open={isAmenityModalOpen}
        onCancel={handleCloseAmenityModal}
        footer={null}
        destroyOnHidden
      >
        <Form form={amenityForm} layout="vertical" onFinish={handleSubmitAmenity}>
          <Form.Item
            name="name"
            label="Tên tiện ích"
            rules={[
              { required: true, message: 'Vui lòng nhập tên tiện ích.' },
              { min: 2, message: 'Tên tiện ích phải từ 2 ký tự.' },
            ]}
          >
            <Input placeholder="Ví dụ: Wifi miễn phí" />
          </Form.Item>

          <div className="room-type-section-label">Hình ảnh tiện ích</div>
          <Upload
            beforeUpload={() => false}
            maxCount={1}
            accept="image/*"
            fileList={amenityImageFileList}
            onChange={({ fileList }) => setAmenityImageFileList(fileList.slice(-1))}
            listType="picture-card"
          >
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>Chọn ảnh</div>
            </div>
          </Upload>

          {editingAmenity?.iconUrl && amenityImageFileList.length === 0 && (
            <div className="room-type-current-image">
              <div className="room-type-section-label">Ảnh hiện tại</div>
              {renderAmenityImage(editingAmenity.iconUrl, editingAmenity.name)}
            </div>
          )}

          <div className="room-type-modal-footer">
            <Button onClick={handleCloseAmenityModal}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingAmenity ? 'Lưu cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomTypeManagement;