import React, { useEffect, useMemo, useState } from 'react';


const normalizeStayDays = (value, hasCharge = false) => {
  const n = Number(value || 0);

  if (n >= 1) return Math.floor(n);

  // Nếu chưa đủ 1 ngày nhưng đã phát sinh tiền phòng / đã nhận phòng trả luôn trong ngày
  if (hasCharge) return 1;

  return 0;
};

const formatStayDays = (value, hasCharge = false) => {
  return `${normalizeStayDays(value, hasCharge)} ngày`;
};

import {
  Modal,
  Spin,
  Typography,
  Divider,
  Row,
  Col,
  Descriptions,
  Button,
  message,
  Space,
  InputNumber,
  Card,
  Input,
  Tag,
  Alert,
  Empty,
  Checkbox,
} from 'antd';
import {
  HomeOutlined,
  AppstoreAddOutlined,
  WarningOutlined,
  GiftOutlined,
  PlusCircleOutlined,
  PercentageOutlined,
  SaveOutlined,
  ApartmentOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import invoiceApi from '../../../api/invoiceApi';
import InvoiceActionButtons from '../../Invoices/components/InvoiceActionButtons';

const { Title, Text } = Typography;

const getValue = (obj, ...keys) => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }

  return undefined;
};

const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

const isPaidSettlement = (value) => {
  const status = normalizeStatus(value);

  return [
    'PAID',
    'DA_THANH_TOAN',
    'DATHANHTOAN',
    'ĐÃ_THANH_TOÁN',
    'DA_THANH_TOAN',
  ].includes(status);
};

const normalizeIds = (ids = []) =>
  Array.from(new Set((ids || []).map(Number).filter(Boolean))).sort((a, b) => a - b);

const areSameIds = (left = [], right = []) => {
  const a = normalizeIds(left);
  const b = normalizeIds(right);

  return a.length === b.length && a.every((value, index) => value === b[index]);
};

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);

const getActualStayNights = (row) => {
  const directValue = Number(
    getValue(row, 'actualStayNights', 'ActualStayNights', 'stayNights', 'StayNights') || 0
  );

  if (directValue > 0) return directValue;

  const roomCharge = Number(getValue(row, 'roomCharge', 'RoomCharge') || 0);
  const checkoutStatus = normalizeStatus(getValue(row, 'checkoutStatus', 'CheckoutStatus'));
  const detailStatus = normalizeStatus(getValue(row, 'status', 'Status'));

  const checkedOut =
    checkoutStatus === 'CHECKEDOUT' ||
    checkoutStatus === 'CHECKED_OUT' ||
    detailStatus === 'CHECKEDOUT' ||
    detailStatus === 'CHECKED_OUT';

  if (roomCharge > 0 && checkedOut) return 1;

  return 0;
};

const isDetailSelectable = (row) => {
  const settlementStatus = getValue(row, 'settlementStatus', 'SettlementStatus');
  const canCreateInvoice = getValue(row, 'canCreateInvoice', 'CanCreateInvoice') === true;
  const hasOpenInvoice = Boolean(getValue(row, 'openInvoiceId', 'OpenInvoiceId'));

  return !isPaidSettlement(settlementStatus) && (canCreateInvoice || hasOpenInvoice);
};

const getSelectableAllIds = (rows) => {
  const selectableIds = rows
    .filter((row) => isDetailSelectable(row))
    .map((row) => getValue(row, 'bookingDetailId', 'BookingDetailId'));

  return normalizeIds(selectableIds);
};

const resolveExistingInvoiceId = (selectionIds, rows) => {
  const normalizedSelectionIds = normalizeIds(selectionIds);
  if (!normalizedSelectionIds.length) return null;

  const selectedRows = rows.filter((row) => normalizedSelectionIds.includes(row.bookingDetailId));
  if (!selectedRows.length) return null;

  const openInvoiceIds = normalizeIds(selectedRows.map((row) => row.openInvoiceId));
  if (openInvoiceIds.length !== 1) return null;

  if (!selectedRows.every((row) => Number(row.openInvoiceId) === openInvoiceIds[0])) {
    return null;
  }

  return openInvoiceIds[0];
};

const buildLocalPreviewPayload = ({
  bookingId,
  bookingDraft,
  selectedRows,
  customerName,
  bookingCode,
}) => {
  const totalStayNights = selectedRows.reduce(
    (sum, row) => sum + Number(row.actualStayNights || 0),
    0
  );

  const totalRoomAmount = selectedRows.reduce((sum, row) => sum + Number(row.roomCharge || 0), 0);
  const totalServiceAmount = selectedRows.reduce((sum, row) => sum + Number(row.serviceCharge || 0), 0);
  const totalDamageAmount = selectedRows.reduce((sum, row) => sum + Number(row.damageCharge || 0), 0);
  const manualAdjustmentAmount = selectedRows.reduce((sum, row) => sum + Number(row.extraFeeAmount || 0), 0);

  const subTotal =
    totalRoomAmount +
    totalServiceAmount +
    totalDamageAmount +
    manualAdjustmentAmount;

  const bookingSubTotal = Number(getValue(bookingDraft, 'subTotal', 'SubTotal') || 0);
  const bookingRoomTotal = Number(getValue(bookingDraft, 'totalRoomAmount', 'TotalRoomAmount') || 0);
  const bookingDiscount = Number(getValue(bookingDraft, 'discountAmount', 'DiscountAmount') || 0);
  const bookingDeposit = Number(getValue(bookingDraft, 'depositAmount', 'DepositAmount') || 0);

  const discountAmount = bookingSubTotal > 0
    ? (bookingDiscount * subTotal) / bookingSubTotal
    : 0;

  const taxableBase = Math.max(0, subTotal - discountAmount);
  const taxAmount = taxableBase * 0.1;
  const grossTotal = Math.max(0, taxableBase + taxAmount);

  const depositAmount = bookingRoomTotal > 0
    ? (bookingDeposit * totalRoomAmount) / bookingRoomTotal
    : bookingDeposit;

  const isPaidSelection =
    selectedRows.length > 0 &&
    selectedRows.every((row) => isPaidSettlement(row.settlementStatus));

  const hasBlockedSelection = selectedRows.some((row) => !isDetailSelectable(row));

  return {
    bookingId,
    bookingCode,
    customerName,
    roomNumbers: selectedRows.map((row) => row.roomNumber),
    bookingDetailIds: selectedRows.map((row) => row.bookingDetailId),
    totalStayNights,
    totalRoomAmount,
    totalServiceAmount,
    totalDamageAmount,
    manualAdjustmentAmount,
    discountAmount,
    taxAmount,
    subTotal,
    grossTotal,
    depositAmount,
    finalTotal: isPaidSelection ? 0 : Math.max(0, grossTotal - depositAmount),
    invoiceStatus: isPaidSelection ? 'PAID' : hasBlockedSelection ? 'UNPAID' : 'DRAFT',
  };
};

const DraftInvoiceModal = ({
  bookingId,
  bookingDetailId,
  invoiceId,
  invoiceStatus,
  initialCustomerName,
  initialBookingCode,
  initialRoomNumber,
  visible,
  onClose,
  onChanged,
}) => {
  const [loading, setLoading] = useState(false);
  const [savingDamage, setSavingDamage] = useState(false);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  const [allDetails, setAllDetails] = useState([]);
  const [bookingDraft, setBookingDraft] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);

  const [explicitSelectedDetailIds, setExplicitSelectedDetailIds] = useState([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState(invoiceId || null);

  const [editedDamageAmount, setEditedDamageAmount] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [birthdayVouchers, setBirthdayVouchers] = useState([]);

  const normalizedDetails = useMemo(
    () =>
      allDetails.map((row) => ({
        bookingDetailId: Number(getValue(row, 'bookingDetailId', 'BookingDetailId') || 0),
        bookingId: Number(getValue(row, 'bookingId', 'BookingId') || bookingId || 0),
        roomNumber: getValue(row, 'roomNumber', 'RoomNumber') || '-',
        plannedNights: Number(getValue(row, 'plannedNights', 'PlannedNights') || 0),
        actualStayNights: getActualStayNights(row),
        roomCharge: Number(getValue(row, 'roomCharge', 'RoomCharge') || 0),
        serviceCharge: Number(getValue(row, 'serviceCharge', 'ServiceCharge') || 0),
        damageCharge: Number(getValue(row, 'damageCharge', 'DamageCharge') || 0),
        extraFeeAmount: Number(getValue(row, 'extraFeeAmount', 'ExtraFeeAmount') || 0),
        canCreateInvoice: Boolean(getValue(row, 'canCreateInvoice', 'CanCreateInvoice')),
        blockReason: getValue(row, 'blockReason', 'BlockReason') || '',
        settlementStatus: getValue(row, 'settlementStatus', 'SettlementStatus') || '',
        checkoutStatus: getValue(row, 'checkoutStatus', 'CheckoutStatus') || '',
        openInvoiceId: Number(getValue(row, 'openInvoiceId', 'OpenInvoiceId') || 0) || null,
        openInvoiceCode: getValue(row, 'openInvoiceCode', 'OpenInvoiceCode') || '',
      })),
    [allDetails, bookingId]
  );

  const loadBaseData = async (preferredDetailIds = []) => {
    if (!bookingId) return;

    try {
      setLoading(true);

      const birthdayVoucherPromise =
        typeof invoiceApi.getBirthdayVouchersForBooking === 'function'
          ? invoiceApi
              .getBirthdayVouchersForBooking(bookingId)
              .catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } });

      const [eligibleRes, draftRes, birthdayVoucherRes] = await Promise.all([
        invoiceApi.getEligibleBookingDetails(bookingId),
        invoiceApi.getDraftInvoice(bookingId),
        birthdayVoucherPromise,
      ]);

      const rows = eligibleRes && eligibleRes.data && eligibleRes.data.data
        ? eligibleRes.data.data
        : eligibleRes && eligibleRes.data
          ? eligibleRes.data
          : [];

      const draftPayload = draftRes && draftRes.data && draftRes.data.data
        ? draftRes.data.data
        : draftRes && draftRes.data
          ? draftRes.data
          : {};

      const birthdayVoucherPayload =
        birthdayVoucherRes && birthdayVoucherRes.data && birthdayVoucherRes.data.data
          ? birthdayVoucherRes.data.data
          : birthdayVoucherRes && birthdayVoucherRes.data
            ? birthdayVoucherRes.data
            : [];

      const normalizedRows = rows.map((row) => ({
        bookingDetailId: Number(getValue(row, 'bookingDetailId', 'BookingDetailId') || 0),
        settlementStatus: getValue(row, 'settlementStatus', 'SettlementStatus') || '',
        canCreateInvoice: Boolean(getValue(row, 'canCreateInvoice', 'CanCreateInvoice')),
        openInvoiceId: Number(getValue(row, 'openInvoiceId', 'OpenInvoiceId') || 0) || null,
        actualStayNights: getActualStayNights(row),
      }));

      const selectableIds = getSelectableAllIds(normalizedRows);
      const nextExplicitIds = normalizeIds(preferredDetailIds).filter((id) =>
        selectableIds.includes(id)
      );

      const nextEffectiveIds = nextExplicitIds.length
        ? nextExplicitIds
        : selectableIds;

      setAllDetails(rows);
      setBookingDraft(draftPayload);
      setBirthdayVouchers(Array.isArray(birthdayVoucherPayload) ? birthdayVoucherPayload : []);
      setVoucherCode(getValue(draftPayload, 'voucherCode', 'VoucherCode') || '');
      setExplicitSelectedDetailIds(nextExplicitIds);
      setActiveInvoiceId(resolveExistingInvoiceId(nextEffectiveIds, normalizedRows));
    } catch (error) {
      console.error('Draft/Invoice API Error:', error);

      const errorMsg =
        error && error.response && error.response.data && error.response.data.message
          ? error.response.data.message
          : error && error.response && error.response.data
            ? error.response.data
            : error && error.message
              ? error.message
              : 'Lỗi khi lấy thông tin hóa đơn';

      message.error(errorMsg);
      onClose && onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;

    setInvoiceDetail(null);
    setActiveInvoiceId(invoiceId || null);
    loadBaseData(bookingDetailId ? [bookingDetailId] : []);
  }, [visible, bookingId, bookingDetailId, invoiceId]);

  useEffect(() => {
    if (!visible || !activeInvoiceId) {
      setInvoiceDetail(null);
      return;
    }

    const fetchInvoiceDetail = async () => {
      try {
        const res = await invoiceApi.getInvoiceDetail(activeInvoiceId);
        const payload = res && res.data && res.data.data
          ? res.data.data
          : res && res.data
            ? res.data
            : {};

        setInvoiceDetail(payload);
      } catch (error) {
        console.error('Load invoice detail error:', error);
        message.error(
          error && error.response && error.response.data && error.response.data.message
            ? error.response.data.message
            : 'Không tải được chi tiết invoice đã tạo.'
        );
      }
    };

    fetchInvoiceDetail();
  }, [visible, activeInvoiceId]);

  const checkedDetailIds = useMemo(
    () =>
      normalizeIds(explicitSelectedDetailIds).filter((id) =>
        normalizedDetails.some((row) => row.bookingDetailId === id && isDetailSelectable(row))
      ),
    [explicitSelectedDetailIds, normalizedDetails]
  );

  const selectedDetailIds = useMemo(() => {
    return checkedDetailIds.length ? checkedDetailIds : getSelectableAllIds(normalizedDetails);
  }, [checkedDetailIds, normalizedDetails]);

  const selectedRows = useMemo(
    () =>
      normalizedDetails.filter(
        (row) => selectedDetailIds.includes(row.bookingDetailId) && isDetailSelectable(row)
      ),
    [normalizedDetails, selectedDetailIds]
  );

  const extraFeeTargets = useMemo(
    () =>
      selectedRows.map((row) => ({
        bookingDetailId: row.bookingDetailId,
        roomNumber: row.roomNumber,
      })),
    [selectedRows]
  );

  const currentInvoiceSelectionIds = useMemo(
    () => normalizeIds(getValue(invoiceDetail, 'bookingDetailIds', 'BookingDetailIds') || []),
    [invoiceDetail]
  );

  const activeInvoiceMatchesSelection = useMemo(
    () =>
      Boolean(activeInvoiceId) &&
      Boolean(invoiceDetail) &&
      areSameIds(currentInvoiceSelectionIds, selectedDetailIds),
    [activeInvoiceId, invoiceDetail, currentInvoiceSelectionIds, selectedDetailIds]
  );

  const previewData = useMemo(() => {
    if (activeInvoiceMatchesSelection) {
      return invoiceDetail;
    }

    return buildLocalPreviewPayload({
      bookingId,
      bookingDraft,
      selectedRows,
      customerName:
        initialCustomerName ||
        getValue(bookingDraft, 'customerName', 'CustomerName') ||
        'Khách lẻ',
      bookingCode:
        initialBookingCode ||
        getValue(bookingDraft, 'bookingCode', 'BookingCode') ||
        '',
    });
  }, [
    activeInvoiceMatchesSelection,
    invoiceDetail,
    bookingId,
    bookingDraft,
    selectedRows,
    initialCustomerName,
    initialBookingCode,
  ]);

  useEffect(() => {
    setEditedDamageAmount(Number(getValue(previewData, 'totalDamageAmount', 'TotalDamageAmount') || 0));
  }, [previewData]);

  const totalStayNightsFromApi = Number(getValue(previewData, 'totalStayNights', 'TotalStayNights') || 0);
  const totalStayNightsFromRows = selectedRows.reduce(
    (sum, row) => sum + Number(row.actualStayNights || 0),
    0
  );
  const totalStayNights = totalStayNightsFromApi || totalStayNightsFromRows;

  const totalRoomAmount = Number(getValue(previewData, 'totalRoomAmount', 'TotalRoomAmount') || 0);
  const totalServiceAmount = Number(getValue(previewData, 'totalServiceAmount', 'TotalServiceAmount') || 0);
  const totalDamageAmount = Number(getValue(previewData, 'totalDamageAmount', 'TotalDamageAmount') || 0);
  const manualAdjustmentAmount = Number(getValue(previewData, 'manualAdjustmentAmount', 'ManualAdjustmentAmount') || 0);
  const discountAmount = Number(getValue(previewData, 'discountAmount', 'DiscountAmount') || 0);
  const taxAmount = Number(getValue(previewData, 'taxAmount', 'TaxAmount') || 0);
  const grossTotalFromApi = getValue(previewData, 'grossTotal', 'GrossTotal');
  const depositAmount = Number(getValue(previewData, 'depositAmount', 'DepositAmount') || 0);
  const finalTotal = Number(getValue(previewData, 'finalTotal', 'FinalTotal') || 0);

  const subTotal = Number(
    getValue(previewData, 'subTotal', 'SubTotal') ??
      totalRoomAmount + totalServiceAmount + totalDamageAmount + manualAdjustmentAmount
  );

  const grossTotal = Number(
    grossTotalFromApi !== undefined && grossTotalFromApi !== null
      ? grossTotalFromApi
      : Math.max(0, subTotal - discountAmount + taxAmount)
  );

  const bookingCode =
    getValue(previewData, 'bookingCode', 'BookingCode') ||
    initialBookingCode ||
    '';

  const customerName =
    getValue(previewData, 'customerName', 'CustomerName') ||
    initialCustomerName ||
    'Khách lẻ';

  const resolvedBookingId = getValue(previewData, 'bookingId', 'BookingId') || bookingId;

  const roomNumbers = getValue(previewData, 'roomNumbers', 'RoomNumbers') || [];

  const currentRoomNumber = roomNumbers.length
    ? roomNumbers.join(', ')
    : initialRoomNumber || '-';

  const currentInvoiceStatus =
    getValue(previewData, 'invoiceStatus', 'InvoiceStatus', 'status', 'Status') ||
    invoiceStatus ||
    'DRAFT';

  const actionInvoiceId = activeInvoiceMatchesSelection ? activeInvoiceId : null;

  const blockedSelectedRows = selectedRows.filter((row) => !isDetailSelectable(row));

  const hasBillableSelection = selectedRows.length > 0 && selectedDetailIds.length > 0;

  const syncSelectionState = (nextExplicitIds = []) => {
    const normalizedExplicitIds = normalizeIds(nextExplicitIds).filter((id) =>
      normalizedDetails.some((row) => row.bookingDetailId === id && isDetailSelectable(row))
    );

    const effectiveIds = normalizedExplicitIds.length
      ? normalizedExplicitIds
      : getSelectableAllIds(normalizedDetails);

    setExplicitSelectedDetailIds(normalizedExplicitIds);
    setActiveInvoiceId(resolveExistingInvoiceId(effectiveIds, normalizedDetails));
    setInvoiceDetail(null);
  };

  const handleToggleDetail = (detail) => {
    if (isPaidSettlement(detail.settlementStatus)) {
      message.info('Phòng ' + detail.roomNumber + ' đã thanh toán, không thể chọn lại để lập hóa đơn.');
      return;
    }

    if (!isDetailSelectable(detail)) {
      message.warning(
        'Phòng ' + detail.roomNumber + ': ' +
        (detail.blockReason || 'Chưa trả phòng nên chưa được lập hóa đơn.')
      );
      return;
    }

    const detailId = Number(detail.bookingDetailId);

    const nextIds = explicitSelectedDetailIds.includes(detailId)
      ? explicitSelectedDetailIds.filter((id) => id !== detailId)
      : [...explicitSelectedDetailIds, detailId];

    syncSelectionState(nextIds);
  };

  const handleSelectAllUnpaid = () => {
    syncSelectionState(getSelectableAllIds(normalizedDetails));
  };

  const handleClearSelection = () => {
    syncSelectionState([]);
  };

  const handleSaveDamage = async () => {
    if (!actionInvoiceId) {
      message.warning('Cần tạo hóa đơn nháp đúng nhóm phòng đang chọn trước khi cập nhật phí đền bù.');
      return;
    }

    try {
      setSavingDamage(true);

      await invoiceApi.updateDamageCharge(actionInvoiceId, {
        amount: Number(editedDamageAmount || 0),
        reason: 'Cập nhật từ màn hình hóa đơn tạm tính',
      });

      message.success('Đã cập nhật phí đền bù hư hỏng.');
      await loadBaseData(explicitSelectedDetailIds);
      await onChanged?.();
    } catch (error) {
      console.error('Update damage charge error:', error);
      message.error(
        error && error.response && error.response.data && error.response.data.message
          ? error.response.data.message
          : 'Không cập nhật được phí đền bù.'
      );
    } finally {
      setSavingDamage(false);
    }
  };

  const handleApplyVoucher = async (clearVoucher = false, overrideCode = null) => {
    if (!bookingId) return;

    try {
      setApplyingVoucher(true);

      await invoiceApi.applyVoucherToBooking(bookingId, {
        code: clearVoucher ? '' : overrideCode || voucherCode,
      });

      message.success(clearVoucher ? 'Đã bỏ voucher khỏi booking.' : 'Áp voucher thành công.');
      await loadBaseData(explicitSelectedDetailIds);
      await onChanged?.();
    } catch (error) {
      console.error('Apply voucher error:', error);
      message.error(
        error && error.response && error.response.data && error.response.data.message
          ? error.response.data.message
          : 'Không áp dụng được voucher.'
      );
    } finally {
      setApplyingVoucher(false);
    }
  };


  const handlePrintCurrentDraft = () => {
    const checkedRows = checkedDetailIds && checkedDetailIds.length > 0
      ? normalizedDetails.filter((row) => checkedDetailIds.includes(row.bookingDetailId))
      : [];

    const billableRows = selectedRows && selectedRows.length > 0
      ? selectedRows
      : [];

    const paidOrHistoryRows = normalizedDetails.filter((row) =>
      Number(row.roomCharge || 0) > 0 ||
      Number(row.serviceCharge || 0) > 0 ||
      Number(row.damageCharge || 0) > 0 ||
      Number(row.extraFeeAmount || 0) > 0
    );

    // Ưu tiên:
    // 1. Nếu người dùng tick phòng thì in đúng phòng được tick.
    // 2. Nếu không tick mà còn phòng lập hóa đơn được thì in nhóm đang tính.
    // 3. Nếu toàn bộ phòng đã thanh toán thì in toàn bộ phòng có dữ liệu tiền.
    // 4. Fallback cuối là in toàn bộ phòng đang hiển thị.
    const printRows = checkedRows.length > 0
      ? checkedRows
      : billableRows.length > 0
        ? billableRows
        : paidOrHistoryRows.length > 0
          ? paidOrHistoryRows
          : normalizedDetails;

    const getPrintStayDays = (row) => {
      const directValue = Number(
        row.actualStayNights ||
        row.ActualStayNights ||
        row.stayDays ||
        row.StayDays ||
        row.stayNights ||
        row.StayNights ||
        0
      );

      if (directValue > 0) return directValue;

      const rowRoomCharge = Number(row.roomCharge || row.RoomCharge || 0);

      // Đã có tiền phòng nghĩa là đã tính lưu trú.
      // Nhận phòng rồi trả luôn trong ngày cũng mặc định 1 ngày.
      return rowRoomCharge > 0 ? 1 : 0;
    };

    const printStayDays = printRows.reduce(
      (sum, row) => sum + getPrintStayDays(row),
      0
    );

    const printRoomTotal = printRows.reduce(
      (sum, row) => sum + Number(row.roomCharge || 0),
      0
    );

    const printServiceTotal = printRows.reduce(
      (sum, row) => sum + Number(row.serviceCharge || 0),
      0
    );

    const printDamageTotal = printRows.reduce(
      (sum, row) => sum + Number(row.damageCharge || 0),
      0
    );

    const printExtraTotal = printRows.reduce(
      (sum, row) => sum + Number(row.extraFeeAmount || 0),
      0
    );

    const printDiscount = Number(discountAmount || 0);
    const printSubTotal = printRoomTotal + printServiceTotal + printDamageTotal + printExtraTotal;
    const printTax = Math.max(0, printSubTotal - printDiscount) * 0.1;
    const printGrossTotal = Math.max(0, printSubTotal - printDiscount + printTax);
    const printDeposit = Number(depositAmount || 0);
    const printFinalTotal = Math.max(0, printGrossTotal - printDeposit);

    const printRoomNumbers = printRows
      .map((row) => row.roomNumber)
      .filter(Boolean)
      .join(', ') || currentRoomNumber;

    const detailRowsHtml = printRows.map((row) => {
      const rowStayDays = getPrintStayDays(row);
      const rowRoomCharge = Number(row.roomCharge || 0);
      const rowServiceCharge = Number(row.serviceCharge || 0);
      const rowDamageCharge = Number(row.damageCharge || 0);
      const rowExtraFee = Number(row.extraFeeAmount || 0);
      const rowSubTotal = rowRoomCharge + rowServiceCharge + rowDamageCharge + rowExtraFee;
      const rowVat = rowSubTotal * 0.1;
      const rowTotal = rowSubTotal + rowVat;

      return [
        '<tr>',
        '<td>' + (row.roomNumber || '-') + '</td>',
        '<td class="right">' + rowStayDays + ' ngày</td>',
        '<td class="right">' + formatVND(rowRoomCharge) + '</td>',
        '<td class="right">' + formatVND(rowServiceCharge) + '</td>',
        '<td class="right">' + formatVND(rowDamageCharge) + '</td>',
        '<td class="right">' + formatVND(rowExtraFee) + '</td>',
        '<td class="right">' + formatVND(rowVat) + '</td>',
        '<td class="right"><b>' + formatVND(rowTotal) + '</b></td>',
        '</tr>'
      ].join('');
    }).join('');

    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      message.error('Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup rồi thử lại.');
      return;
    }

    const html = [
      '<!doctype html>',
      '<html>',
      '<head>',
      '<meta charset="utf-8" />',
      '<title>Bản nháp hóa đơn</title>',
      '<style>',
      'body{font-family:Arial,sans-serif;padding:24px;color:#111;}',
      'h2{text-align:center;margin-bottom:24px;}',
      'h3{margin-top:20px;margin-bottom:10px;}',
      'table{width:100%;border-collapse:collapse;margin-bottom:18px;}',
      'td,th{border:1px solid #ddd;padding:8px;font-size:14px;}',
      'th{background:#f5f5f5;}',
      '.right{text-align:right;}',
      '.danger{font-size:18px;font-weight:bold;color:#d4380d;}',
      '</style>',
      '</head>',
      '<body>',
      '<h2>BẢN NHÁP HÓA ĐƠN</h2>',

      '<table>',
      '<tr><td><b>Khách hàng</b></td><td>' + customerName + '</td></tr>',
      '<tr><td><b>Mã booking</b></td><td>' + bookingCode + '</td></tr>',
      '<tr><td><b>Booking ID</b></td><td>' + resolvedBookingId + '</td></tr>',
      '<tr><td><b>Phòng</b></td><td>' + printRoomNumbers + '</td></tr>',
      '<tr><td><b>Số ngày đã ở</b></td><td>' + printStayDays + ' ngày</td></tr>',
      '<tr><td><b>Trạng thái</b></td><td>' + currentInvoiceStatus + '</td></tr>',
      '</table>',

      '<h3>Chi tiết phòng</h3>',
      '<table>',
      '<thead>',
      '<tr>',
      '<th>Phòng</th>',
      '<th>Số ngày đã ở</th>',
      '<th>Tiền phòng</th>',
      '<th>Dịch vụ</th>',
      '<th>Đền bù</th>',
      '<th>Phụ phí</th>',
      '<th>VAT</th>',
      '<th>Thành tiền</th>',
      '</tr>',
      '</thead>',
      '<tbody>',
      detailRowsHtml || '<tr><td colspan="8" style="text-align:center;">Không có dữ liệu phòng</td></tr>',
      '</tbody>',
      '</table>',

      '<h3>Tổng hợp</h3>',
      '<table>',
      '<tr><td>Số ngày đã ở</td><td class="right">' + printStayDays + ' ngày</td></tr>',
      '<tr><td>Tiền phòng</td><td class="right">' + formatVND(printRoomTotal) + '</td></tr>',
      '<tr><td>Tiền dịch vụ</td><td class="right">' + formatVND(printServiceTotal) + '</td></tr>',
      '<tr><td>Tiền đền bù</td><td class="right">' + formatVND(printDamageTotal) + '</td></tr>',
      '<tr><td>Phụ phí thêm</td><td class="right">' + formatVND(printExtraTotal) + '</td></tr>',
      '<tr><td>Giảm giá</td><td class="right">-' + formatVND(printDiscount) + '</td></tr>',
      '<tr><td>VAT</td><td class="right">' + formatVND(printTax) + '</td></tr>',
      '<tr><td><b>Tổng hóa đơn</b></td><td class="right"><b>' + formatVND(printGrossTotal) + '</b></td></tr>',
      '<tr><td>Tiền cọc đã thu</td><td class="right">-' + formatVND(printDeposit) + '</td></tr>',
      '<tr><td><b>Số tiền cần thanh toán</b></td><td class="right danger">' + formatVND(printFinalTotal) + '</td></tr>',
      '</table>',

      '</body>',
      '</html>'
    ].join('');

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <Modal
      title={
        <Title level={3} style={{ marginBottom: 0 }}>
          Hóa đơn tạm tính theo Booking
        </Title>
      }
      open={visible}
      onCancel={onClose}
      width={1100}
      centered
      destroyOnClose
      footer={[
        <div
          key="footer-wrap"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          <Space wrap>
            {hasBillableSelection ? (
              <InvoiceActionButtons
                bookingId={bookingId}
                bookingDetailIds={selectedDetailIds}
                invoiceId={actionInvoiceId}
                invoiceStatus={currentInvoiceStatus}
                extraFeeTargets={extraFeeTargets}
                onInvoiceCreated={(newInvoiceId) => {
                  setActiveInvoiceId(newInvoiceId);
                }}
                onChanged={async (payload) => {
                  const nextPayload = payload && (payload.invoiceId || payload.InvoiceId) ? payload : null;

                  if (nextPayload) {
                    setInvoiceDetail(nextPayload);
                    setActiveInvoiceId(nextPayload.invoiceId || nextPayload.InvoiceId);
                  }

                  await loadBaseData(explicitSelectedDetailIds);
                  await onChanged?.(payload);
                }}
              />
            ) : (
              <Space wrap>
                <Button onClick={handlePrintCurrentDraft}>
                  In bản nháp
                </Button>
                <Button disabled>
                  Thao tác nhanh
                </Button>
                <Button type="primary" disabled>
                  Chốt hóa đơn
                </Button>
              </Space>
            )}
          </Space>

          <Button key="close" onClick={onClose} size="large">
            Đóng cửa sổ
          </Button>
        </div>,
      ]}
    >
      <Spin spinning={loading} tip="Đang tải hóa đơn...">
        {!bookingId ? (
          <Empty description="Không có booking để hiển thị hóa đơn." />
        ) : (
          <div style={{ padding: '10px 0' }}>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Tên khách hàng">
                <Text strong>{customerName}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Mã Booking">
                <Text strong>{bookingCode}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Booking ID">
                <Text strong>{resolvedBookingId}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Nhóm phòng đang xem">
                <Text strong>{currentRoomNumber}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Số ngày/đêm đã ở">
                <Text strong>{formatStayDays(totalStayNights, Number(totalRoomAmount || 0) > 0)}</Text>
              </Descriptions.Item>

              {actionInvoiceId ? (
                <Descriptions.Item label="Invoice ID hiện tại">
                  <Text strong>{actionInvoiceId}</Text>
                </Descriptions.Item>
              ) : null}

              <Descriptions.Item label="Trạng thái hiện tại">
                <Tag
                  color={
                    normalizeStatus(currentInvoiceStatus) === 'PAID'
                      ? 'green'
                      : normalizeStatus(currentInvoiceStatus) === 'UNPAID'
                        ? 'gold'
                        : 'orange'
                  }
                >
                  {String(currentInvoiceStatus).toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {!hasBillableSelection ? (
              <Alert
                style={{ marginBottom: 16 }}
                type="info"
                showIcon
                message="Không có phòng nào đủ điều kiện lập hóa đơn"
                
              />
            ) : null}

            <Card
              title={
                <>
                  <ApartmentOutlined /> Danh sách phòng trong booking
                </>
              }
              size="small"
              style={{ marginBottom: 16 }}
            >
              <Space wrap style={{ marginBottom: 16 }}>
                <Button onClick={handleClearSelection}>
                  Bỏ chọn
                </Button>

                <Button onClick={handleSelectAllUnpaid} disabled={!normalizedDetails.length}>
                  Chọn tất cả
                </Button>
              </Space>

              <Row gutter={[12, 12]}>
                {normalizedDetails.map((detail) => {
                  const paid = isPaidSettlement(detail.settlementStatus);
                  const selectable = isDetailSelectable(detail);
                  const selected = selectable && checkedDetailIds.includes(detail.bookingDetailId);
                  const detailTotal = detail.roomCharge + detail.serviceCharge + detail.damageCharge + Number(detail.extraFeeAmount || 0);
                  const actualStayNights = detail.actualStayNights || (detail.roomCharge > 0 ? 1 : 0);

                  return (
                    <Col xs={24} sm={12} lg={8} key={detail.bookingDetailId}>
                      <Card
                        hoverable={selectable}
                        size="small"
                        onClick={() => selectable && handleToggleDetail(detail)}
                        style={{
                          borderColor: selected ? '#1677ff' : '#f0f0f0',
                          boxShadow: selected ? '0 0 0 1px rgba(22,119,255,0.15)' : 'none',
                          cursor: selectable ? 'pointer' : 'not-allowed',
                          opacity: selectable ? 1 : 0.72,
                        }}
                      >
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                            <Space>
                              <Checkbox
                                checked={selected}
                                disabled={!selectable}
                                onClick={(event) => event.stopPropagation()}
                                onChange={() => handleToggleDetail(detail)}
                              />
                              <Text strong>Phòng {detail.roomNumber}</Text>
                            </Space>

                            <Text type="secondary">#{detail.bookingDetailId}</Text>
                          </Space>

                          <Space wrap>
                            {selected ? <Tag color="blue">ĐANG CHỌN</Tag> : null}
                            {paid ? <Tag color="green">ĐÃ THANH TOÁN</Tag> : null}

                            {detail.openInvoiceId ? (
                              <Tag color="orange">
                                {detail.openInvoiceCode || ('DRAFT #' + detail.openInvoiceId)}
                              </Tag>
                            ) : null}

                            {!paid && detail.canCreateInvoice ? (
                              <Tag color="blue">CÓ THỂ LẬP HĐ</Tag>
                            ) : null}

                            {!paid && !detail.canCreateInvoice && !detail.openInvoiceId ? (
                              <Tag color="red">
                                {detail.blockReason || 'CHƯA ĐỦ ĐIỀU KIỆN'}
                              </Tag>
                            ) : null}
                          </Space>

                          <Text type="secondary">Check-out: {detail.checkoutStatus || '-'}</Text>
                          <Text type="secondary">Số ngày/đêm đã ở: {actualStayNights} ngày</Text>
                          <Text type="secondary">
                            Tạm tính phần phòng này: {formatVND(detailTotal)}
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card>

            {blockedSelectedRows.length ? (
              <Alert
                style={{ marginBottom: 16 }}
                type="warning"
                showIcon
                message="Nhóm phòng đang chọn có phòng chưa đủ điều kiện lập hóa đơn"
                description={blockedSelectedRows
                  .map((row) => row.roomNumber + ': ' + (row.blockReason || 'Chưa checkout'))
                  .join(' • ')}
              />
            ) : null}

            <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8 }}>
              <Title level={5}>
                <GiftOutlined style={{ color: '#52c41a' }} /> Áp voucher cho booking
              </Title>

              <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 16 }}>
                <Col xs={24} md={12}>
                  <Input
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    prefix={<TagsOutlined />}
                    placeholder="Nhập mã voucher"
                    allowClear
                  />
                </Col>

                <Col>
                  <Space wrap>
                    <Button
                      type="primary"
                      onClick={() => handleApplyVoucher(false)}
                      loading={applyingVoucher}
                    >
                      Áp dụng voucher
                    </Button>

                    <Button
                      onClick={() => handleApplyVoucher(true)}
                      disabled={!(voucherCode || getValue(bookingDraft, 'voucherCode', 'VoucherCode'))}
                      loading={applyingVoucher}
                    >
                      Bỏ voucher
                    </Button>
                  </Space>
                </Col>
              </Row>

              {getValue(bookingDraft, 'voucherCode', 'VoucherCode') ? (
                <Text type="success">
                  Voucher đang áp dụng:{' '}
                  <b>{getValue(bookingDraft, 'voucherCode', 'VoucherCode')}</b>
                </Text>
              ) : (
                <Text type="secondary">Booking hiện chưa áp dụng voucher.</Text>
              )}

              {!getValue(bookingDraft, 'voucherCode', 'VoucherCode') &&
              birthdayVouchers.length > 0 ? (
                <Alert
                  style={{ marginTop: 12 }}
                  type="success"
                  showIcon
                  message="Hiện tại khách đang có voucher sinh nhật. Có muốn sử dụng không?"
                  description={
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {birthdayVouchers.map((voucher) => {
                        const code = getValue(voucher, 'code', 'Code');
                        const displayText =
                          getValue(voucher, 'displayText', 'DisplayText') || code;

                        return (
                          <Space key={code} wrap>
                            <Tag color="green">{code}</Tag>
                            <Text>{displayText}</Text>
                            <Button
                              size="small"
                              type="primary"
                              loading={applyingVoucher}
                              onClick={() => {
                                setVoucherCode(code);
                                handleApplyVoucher(false, code);
                              }}
                            >
                              Dùng voucher này
                            </Button>
                          </Space>
                        );
                      })}
                    </Space>
                  }
                />
              ) : null}

              <Divider style={{ margin: '16px 0' }} />

              <Title level={5}>
                <HomeOutlined /> Tiền phòng
              </Title>

              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Col>
                  <Text>Số ngày/đêm đã ở:</Text>
                </Col>
                <Col>
                  <Text strong>{formatStayDays(totalStayNights, Number(totalRoomAmount || 0) > 0)}</Text>
                </Col>
              </Row>

              <Row justify="space-between">
                <Col>
                  <Text>Tổng tiền các phòng đang chọn:</Text>
                </Col>
                <Col>
                  <Text strong>{formatVND(totalRoomAmount)}</Text>
                </Col>
              </Row>

              <Divider style={{ margin: '12px 0' }} />

              <Title level={5}>
                <AppstoreAddOutlined style={{ color: '#1890ff' }} /> Dịch vụ sử dụng
              </Title>

              <Row justify="space-between">
                <Col>
                  <Text>Tổng chi phí dịch vụ thêm:</Text>
                </Col>
                <Col>
                  <Text strong>{formatVND(totalServiceAmount)}</Text>
                </Col>
              </Row>

              <Divider style={{ margin: '12px 0' }} />

              <Title level={5}>
                <WarningOutlined style={{ color: '#f5222d' }} /> Phí đền bù hư hỏng
              </Title>

              <Row justify="space-between" align="middle" gutter={[12, 12]}>
                <Col>
                  <Text>Tổng phí phạt/đền bù:</Text>
                </Col>

                <Col>
                  <Space wrap>
                    <InputNumber
                      min={0}
                      precision={0}
                      value={editedDamageAmount}
                      onChange={(value) => setEditedDamageAmount(value || 0)}
                      style={{ width: 180 }}
                      formatter={(value) => String(Number(value || 0).toLocaleString('vi-VN')) + ' ₫'}
                      parser={(value) =>
                        Number(
                          String(value || '')
                            .replace(/[₫\s,.]/g, '')
                            .replace(/[^\d-]/g, '')
                        ) || 0
                      }
                      disabled={!actionInvoiceId || savingDamage}
                    />

                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveDamage}
                      loading={savingDamage}
                      disabled={!actionInvoiceId}
                    >
                      Lưu
                    </Button>
                  </Space>
                </Col>
              </Row>

              {manualAdjustmentAmount > 0 ? (
                <>
                  <Divider style={{ margin: '12px 0' }} />

                  <Title level={5}>
                    <PlusCircleOutlined style={{ color: '#722ed1' }} /> Phụ phí thêm
                  </Title>

                  <Row justify="space-between">
                    <Col>
                      <Text>Phụ phí / điều chỉnh thêm:</Text>
                    </Col>
                    <Col>
                      <Text strong style={{ color: '#722ed1' }}>
                        {formatVND(manualAdjustmentAmount)}
                      </Text>
                    </Col>
                  </Row>
                </>
              ) : null}

              <Divider style={{ margin: '12px 0' }} />

              <Row justify="space-between" style={{ marginTop: 20 }}>
                <Col>
                  <Title level={5}>Tạm Tính (Subtotal):</Title>
                </Col>
                <Col>
                  <Title level={5}>{formatVND(subTotal)}</Title>
                </Col>
              </Row>

              {discountAmount > 0 ? (
                <Row justify="space-between" style={{ marginTop: 10 }}>
                  <Col>
                    <Text type="success">
                      <GiftOutlined /> Voucher giảm giá:
                    </Text>
                  </Col>
                  <Col>
                    <Text type="success">-{formatVND(discountAmount)}</Text>
                  </Col>
                </Row>
              ) : null}

              {taxAmount > 0 ? (
                <Row justify="space-between" style={{ marginTop: 10 }}>
                  <Col>
                    <Text>
                      <PercentageOutlined /> VAT:
                    </Text>
                  </Col>
                  <Col>
                    <Text strong>+{formatVND(taxAmount)}</Text>
                  </Col>
                </Row>
              ) : null}

              <Row justify="space-between" style={{ marginTop: 10 }}>
                <Col>
                  <Text strong>Tổng tiền hóa đơn:</Text>
                </Col>
                <Col>
                  <Text strong>{formatVND(grossTotal)}</Text>
                </Col>
              </Row>

              <Row justify="space-between" style={{ marginTop: 10 }}>
                <Col>
                  <Text strong type="warning">
                    Tiền cọc đã thu:
                  </Text>
                </Col>
                <Col>
                  <Text strong type="warning">
                    -{formatVND(depositAmount)}
                  </Text>
                </Col>
              </Row>
            </div>

            <div
              style={{
                background: '#e6f7ff',
                padding: 20,
                borderRadius: 8,
                marginTop: 20,
                border: '1px solid #91d5ff',
              }}
            >
              <Row justify="space-between" align="middle">
                <Col>
                  <Title level={4} style={{ margin: 0, color: '#0050b3' }}>
                    Tổng Cộng Cần Thanh Toán
                  </Title>
                </Col>

                <Col>
                  <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                    {formatVND(finalTotal)}
                  </Title>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default DraftInvoiceModal;
