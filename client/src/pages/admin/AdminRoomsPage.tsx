import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Users,
  Layers,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import type { RoomType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RoomImage } from '../../components/common/RoomImage';

export const AdminRoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal State (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [capacity, setCapacity] = useState<number>(2);
  const [pricePerNight, setPricePerNight] = useState<number>(150);
  const [totalInventory, setTotalInventory] = useState<number>(5);
  const [facilitiesStr, setFacilitiesStr] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');

  const fetchRooms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAllRooms();
      setRooms(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load rooms.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingRoom(null);
    setName('');
    setDescription('');
    setCapacity(2);
    setPricePerNight(150);
    setTotalInventory(5);
    setFacilitiesStr('Wi-Fi, Air Conditioning, Flat-screen TV, Mini Bar');
    setImageUrl('https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (room: RoomType) => {
    setEditingRoom(room);
    setName(room.name);
    setDescription(room.description);
    setCapacity(room.capacity);
    setPricePerNight(room.pricePerNight);
    setTotalInventory(room.totalInventory);
    setFacilitiesStr(room.facilities.join(', '));
    setImageUrl(room.imageUrl);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Create or Edit form
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const facilitiesArray = facilitiesStr
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (facilitiesArray.length === 0) {
      setFormError('Please specify at least one facility (comma separated).');
      setIsSaving(false);
      return;
    }

    try {
      if (editingRoom) {
        // Edit existing room
        await adminApi.updateRoom(editingRoom._id, {
          name,
          description,
          capacity,
          pricePerNight,
          totalInventory,
          facilities: facilitiesArray,
          imageUrl,
        });
        setActionSuccess(`Room type '${name}' updated successfully.`);
      } else {
        // Create new room + auto-generate 60 days inventory
        await adminApi.createRoom({
          name,
          description,
          capacity,
          pricePerNight,
          totalInventory,
          facilities: facilitiesArray,
          imageUrl,
          isActive: true,
        });
        setActionSuccess(`Room type '${name}' created with 60 days of daily inventory.`);
      }

      setIsModalOpen(false);
      await fetchRooms();
    } catch (err: any) {
      setFormError(
        err.response?.data?.error?.message ||
          'Failed to save room type. Please verify inputs.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (room: RoomType) => {
    try {
      await adminApi.toggleRoomStatus(room._id, !room.isActive);
      setActionSuccess(
        `Room type '${room.name}' is now ${!room.isActive ? 'Active' : 'Inactive'}.`
      );
      await fetchRooms();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Failed to toggle room active status.'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Room Types & Inventory Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure room types, pricing, capacity, and activate or deactivate categories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRooms}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Room Type
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between gap-3 shadow-xs">
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Rooms Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading hotel room catalog..." className="py-20" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Room Type</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4">Nightly Price</th>
                  <th className="py-3.5 px-4">Total Inventory</th>
                  <th className="py-3.5 px-4">Catalog Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rooms.map((room) => (
                  <tr key={room._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Room Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <RoomImage
                          src={room.imageUrl}
                          alt={room.name}
                          className="w-12 h-12 object-cover rounded-xl shrink-0 border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{room.name}</p>
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-xs">
                            {room.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Capacity */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Users className="w-3.5 h-3.5 text-brand-600" />
                        Up to {room.capacity}
                      </span>
                    </td>

                    {/* Nightly Price */}
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {formatCurrency(room.pricePerNight)}
                      <span className="text-xs text-slate-400 font-normal"> / night</span>
                    </td>

                    {/* Inventory */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        {room.totalInventory} units
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(room)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          room.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="Click to toggle active status in guest catalog"
                      >
                        {room.isActive ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(room)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Room Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? `Edit ${editingRoom.name}` : 'Create New Room Type'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {formError}
            </div>
          )}

          <Input
            label="Room Type Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Deluxe Penthouse Suite"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the room, space, views, and experience..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Guest Capacity"
              type="number"
              min={1}
              max={10}
              required
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
            />

            <Input
              label="Price Per Night ($)"
              type="number"
              min={0}
              required
              value={pricePerNight}
              onChange={(e) => setPricePerNight(parseFloat(e.target.value))}
            />

            <Input
              label="Total Physical Rooms"
              type="number"
              min={1}
              required
              value={totalInventory}
              onChange={(e) => setTotalInventory(parseInt(e.target.value, 10))}
            />
          </div>

          <Input
            label="Room Image URL"
            type="url"
            required
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
          />

          <Input
            label="Facilities (comma-separated)"
            required
            value={facilitiesStr}
            onChange={(e) => setFacilitiesStr(e.target.value)}
            placeholder="King Bed, Balcony, Wi-Fi, Nespresso, AC"
            helperText="Separate multiple facilities with commas"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {editingRoom ? 'Save Changes' : 'Create Room Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
